import { html as htmlUtils } from './utils.js'
import { parsePlaceholders } from './html-placeholder-parser.js'
const { placeholder: placeholderStr, indexPlaceholders, regex: placeholderRegex, mergeSplitWithValues } = htmlUtils

const getSiblingIndex = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex(previousSibling, i + 1) : i

const getNodePath = ({node, node: {parentElement: parent} = {}, path = []}) => parent
  ? getNodePath({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
  : [...path, getSiblingIndex(node)].reverse()

const getNode = (node, path) => path.reduce((currNode, i) => currNode.childNodes.item(i), node)

const getValueIndexDifferences = (arr, arr2) => arr2.length > arr.length
  ? getValueIndexDifferences(arr2, arr)
  : arr.reduce((arr, item, i) => [...arr, ...item !== arr2[i] ? [i] : []], [])

const getPlaceholderWithNodes = (node, placeholders) =>
  placeholders.map(placeholder => ({...placeholder,
    ...placeholder.type === 'text'
    ? {nodes: [getNode(node, placeholder.path)]}
    : {node: getNode(node, placeholder.path)}
  }))

const flattenArray = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray(item)] : [...arr, item], [])

const replaceArray = (arr, target, replacement) => arr.reduce((arr, item) => [...arr,
  target === item
  ? replacement
  : Array.isArray(item)
    ? replaceArray(item, target, replacement)
    : item
], [])

const getPlaceholderWithPaths = (node, _placeholders) => {
  const placeholders = _placeholders.reduce((arr, placeholder) => [...arr, ...placeholder.type === 'text'
    ? [...placeholder.indexes.map(index => ({type: 'text', index}))]
    : [placeholder]]
  , [])
  const placeholderByIndex = indexPlaceholders(placeholders)
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, null, false)
  const paths = new Map()
  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    const match = currentNode.nodeValue.match(placeholderRegex)
    if (match) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const placeholderNode = currentNode.splitText(match.index)
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length)
        if (placeholderNode.nodeValue.length) placeholderNode.splitText(0)
        if (!currentNode.nodeValue.length) currentNode.parentNode.removeChild(currentNode)
        paths.set(placeholderByIndex[match[1]], getNodePath({node: placeholderNode}))
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        paths.set(placeholderByIndex[match[1]], getNodePath({node: currentNode}))
      }
    }
  }
  for (const placeholder of placeholders) {
    const type = placeholder.type
    if (type === 'attribute' || type === 'tag') {
      const attributeName = placeholderStr(placeholder.indexes[0])
      const foundNode = node.querySelector(`[${attributeName}]`)
      foundNode.removeAttribute(attributeName)
      paths.set(placeholder, getNodePath({node: foundNode}))
    }
  }
  return [...paths].map(([placeholder, path]) => ({...placeholder, path}))
}

const patchDomArray = (newArray, oldArray) => {

}

const createInstance = ({ id, template, placeholders: _placeholders }, ...values) => {
  const doc = document.importNode(template.content, true)
  let bypassDif = true
  let childNodes = [...doc.childNodes]
  let listeners = []
  const placeholders = getPlaceholderWithNodes(doc, _placeholders) // placeholder node(s) are mutable
  let placeholdersData = new Map(placeholders.map(placeholder => [placeholder, {}]))
  let placeholderByIndex = indexPlaceholders(placeholders)
  const instance = {
    id,
    values,
    instance: true,
    __reactivity__: false,
    get _childNodes () { return childNodes },
    get childNodes () { return flattenArray(childNodes) },
    get content () {
      for (const node of instance.childNodes) doc.appendChild(node)
      return doc
    },
    update (...values) {
      const placeholdersToUpdate =
      bypassDif // if bypass, update all the placeholders (first placeholder setup)
      ? placeholders // all placeholders
      : getValueIndexDifferences(values, instance.values) // placeholders which split values has changed
        .map(i => placeholderByIndex[i]) // placeholders
        .filter(item => item && (item.node || item.nodes))
        .reduce((arr, placeholder) => [...arr,
          ...placeholder.type === 'tag'
          ? [placeholder, ...placeholder.attributes.map(indexes => placeholderByIndex[indexes[0]])]
          : [placeholder]
        ], []) // placeholders with attributes of tags that need update
        .reduce((arr, placeholder) => [...arr,
          ...arr.includes(placeholder)
          ? []
          : [placeholder]
        ]
        , []) // remove duplicates
      const placeholderByOldNode = new Map(placeholdersToUpdate.map(placeholder => [placeholder.node || placeholder.nodes, placeholder]))
      const updateResults = new Map(placeholdersToUpdate.map(placeholder => {
        const result = update[placeholder.type]({
          placeholder,
          values,
          data: placeholdersData.get(placeholder),
          placeholderByIndex,
          _childNodes: instance._childNodes,
          setChildNodes: _childNodes => (childNodes = _childNodes)
        })
        if ((result.node || result.nodes) === (placeholder.node || placeholder.nodes)) return [placeholder, result]
        if (placeholder.type === 'tag' || placeholder.type === 'attribute') {
          if (placeholder.tag && placeholder.tag.length) placeholderByIndex[placeholder.tag[0]].node = result.node
          for (const attrIndex of placeholder.attributes) {
            placeholderByIndex[attrIndex[0]].node = result.node
          }
        }
        if (placeholder.type === 'text') placeholder.nodes = result.nodes
        else placeholder.node = result.node
        return [placeholder, result]
      }))
      placeholdersData = new Map([...placeholdersData].map(([placeholder, data]) => [placeholder,
        updateResults.has(placeholder)
        ? updateResults.get(placeholder).data
        : data
      ]))
      const newChildNodes = [...childNodes].map(item => {
        if (placeholderByOldNode.has(item)) {
          const placeholder = placeholderByOldNode.get(item)
          const result = updateResults.get(placeholder)
          return result.node || result.nodes
        } else {
          return item
        }
      })
      patchDomArray(flattenArray(newChildNodes), flattenArray(childNodes))
      const oldChildNodes = childNodes
      childNodes = newChildNodes
      for (const listener of listeners) listener(newChildNodes, oldChildNodes)
    },
    listen (func) {
      listeners = [...listeners, func]
      return _ => (listeners = Object.assign([...listeners], {[listeners.indexOf(func)]: undefined}).filter(item => item))
    }
  }
  const textPlaceholdersByFirstNode = new Map(placeholders.filter(({type}) => type === 'text').map(placeholder => [placeholder.nodes[0], placeholder]))
  childNodes = childNodes.reduce((arr, node) =>
    textPlaceholdersByFirstNode.has(node)
    ? [...arr, textPlaceholdersByFirstNode.get(node).nodes]
    : [...arr, node]
  , [])
  instance.update(...values)
  bypassDif = false
  return instance
}

const createBuild = ({id, html, placeholders: _placeholders}) => {
  const template = document.createElement('template')
  template.innerHTML = html
  const placeholders = getPlaceholderWithPaths(template.content, _placeholders)
  return values => {
    const _createInstance = createInstance.bind(null, { id, template, placeholders }, ...values)
    _createInstance.build = true
    _createInstance.id = id
    _createInstance.values = values
    return _createInstance
  }
}

const cache = new Map()

export const html = (htmlArray, ...values) => {
  const id = htmlArray.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  const { html, placeholders } = parsePlaceholders({htmlArray, values})
  const build = createBuild({ id, html, placeholders })
  cache.set(id, build)
  return build(values)
}

// values, node(s), split(s), data

const update = {
  comment ({ values, placeholder: { node, split } }) {
    node.nodeValue = mergeSplitWithValues(split, values)
    return {node}
  },
  text ({ value, values, placeholder, _childNodes, setChildNodes, data: { instance: oldInstance, unlisten: oldUnlisten } = {}, placeholder: { nodes, index } }) {
    if (values && !value) value = values[index]
    if (typeof value === 'string' || typeof value === 'number') {
      if (nodes[0] instanceof Text) {
        if (nodes[0].nodeValue !== value) nodes[0].nodeValue = value
        return { nodes: [nodes[0]] }
      } else {
        return { nodes: [new Text(value)] }
      }
    } else if (value instanceof Node) {
      if (nodes[0] !== value) return { nodes: [value] }
    } else if (value.build) {
      if (oldInstance && oldInstance.instance && oldInstance.id === value.id) {
        oldInstance.update(...value.values)
        return { nodes: oldInstance._childNodes, data: { instance: oldInstance } }
      } else {
        if (oldUnlisten) oldUnlisten()
        const instance = value()
        const unlisten = instance.listen((newChildNodes, oldChildNodes) => {
          // const newNodes = _childNodes.slice()
          // // console.log(newChildNodes)
          // // console.log(oldChildNodes)
          // // console.log(newNodes)
          // newNodes[newNodes.indexOf(oldChildNodes)] = newChildNodes
          // // console.log(newNodes)
          // setChildNodes(newNodes)
        })
        return { nodes: instance._childNodes, data: { instance, unlisten } }
      }
    } else if (Array.isArray(value)) {
      // return value.map(value => update.text({value}))
    }
  },
  tag ({ values, placeholder: { attributes, node: _node, split }, placeholderByIndex }) {
    const node = document.createElement(mergeSplitWithValues(split, values))
    for (const {name, value} of _node.attributes) node.setAttribute(name, value)
    return {node}
  },
  attribute ({ values, placeholder, data: { oldName } = {}, placeholder: { attributeType, node, nameSplit, valueSplit } }) {
    const name = mergeSplitWithValues(nameSplit, values)
    const value = mergeSplitWithValues(valueSplit, values)
    if (attributeType === '"') { // double-quote
      if (oldName) node.removeAttribute(oldName)
      node.setAttribute(name, value)
    } else if (attributeType === '\'') {  // single-quote
      if (oldName) node.removeAttribute(oldName)
      node.setAttribute(name, value)
    } else if (attributeType === '') {  // no-quote
      node[name] = value
    }
    return {node, data: { oldName: name }}
  }
}
