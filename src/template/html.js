import { html as htmlUtils } from './utils.js'
import { parsePlaceholders } from './html-placeholder-parser.js'
const { placeholder: placeholderStr, indexPlaceholders, regex: placeholderRegex, mergeSplitWithValues, mergeSplitWithPlaceholders, split } = htmlUtils

const getSiblingIndex = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex(previousSibling, i + 1) : i

const getNodePath = ({node, node: {parentElement: parent} = {}, path = []}) => parent
  ? getNodePath({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
  : [...path, getSiblingIndex(node)].reverse()

const getNode = (node, path) => path.reduce((currNode, i) => currNode.childNodes.item(i), node)

const getValueIndexDifferences = (arr, arr2) => arr2.length > arr.length
  ? getValueIndexDifferences(arr2, arr)
  : arr.reduce((arr, item, i) => [...arr, ...item !== arr2[i] ? [i] : []], [])

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
  const nodes = new Map()
  const paths = new Map()
  const nodesToRemove = []
  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    const match = currentNode.nodeValue.match(placeholderRegex)
    if (match) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const placeholderNode = currentNode.splitText(match.index)
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length)
        if (placeholderNode.nodeValue.length) placeholderNode.splitText(0)
        if (!currentNode.nodeValue.length) nodesToRemove.push(currentNode) // currentNode.parentNode.removeChild(currentNode)
        nodes.set(placeholderByIndex[match[1]], placeholderNode)
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        nodes.set(placeholderByIndex[match[1]], currentNode)
      }
    }
  }
  for (const node of nodesToRemove) node.parentNode.removeChild(node)
  for (const placeholder of placeholders) {
    const type = placeholder.type
    const index = placeholder.index || placeholder.indexes[0]
    paths.set(placeholder, getNodePath({node: nodes.get(placeholder)}))
    if (type === 'attribute' || type === 'tag') {
      const attributeName = placeholderStr(placeholder.indexes[0])
      const foundNode = node.querySelector(`[${attributeName}]`)
      foundNode.removeAttribute(attributeName)
      paths.set(placeholder, getNodePath({node: foundNode}))
    }
  }
  return [...paths].map(([placeholder, path]) => ({...placeholder, path}))
}
// =======================================RECODE THIS PART=======================================
const patchDomArray = (newArray, oldArray) => {
  const nodesToRemove = oldArray.filter(node => !newArray.includes(node))
  for (const i in newArray) {
    const newNode = newArray[i]
    const oldNode = oldArray[i]
    if (newNode !== oldNode) {
      if (oldNode && oldNode.parentNode) {
        oldNode.parentNode.insertBefore(newNode, oldNode)
        oldNode.parentNode.removeChild(oldNode)
      } else {
        const previousNewNode = newArray[i - 1]
        if (previousNewNode && previousNewNode.parentNode) {
          previousNewNode.parentNode.insertBefore(newNode, previousNewNode.nextSibling)
          if (oldNode && oldNode.parentNode) oldNode.parentNode.removeChild(oldNode)
        }
      }
    }
  }
  for (const node of nodesToRemove) {
    if (node && node.parentNode) node.parentNode.removeChild(node)
  }
}
// =======================================/RECODE THIS PART/=======================================
const newPlaceholdersNodes = (oldMap, placeholder, nodes) => {
  const newMap = new Map(oldMap)
  newMap.set(placeholder, nodes)
  return newMap
}

const createInstance = ({ id, template, placeholders }, ...values) => {
  const doc = document.importNode(template.content, true)
  let bypassDif = true
  let childNodes = [...doc.childNodes]
  let listeners = []
  let placeholdersNodes = new Map(placeholders.map(placeholder => ([placeholder,
    placeholder.type === 'text'
    ? [getNode(doc, placeholder.path)]
    : getNode(doc, placeholder.path)
  ])))
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
        .map(index => placeholderByIndex[index]) // placeholders
        .filter(placeholder => placeholder && placeholdersNodes.get(placeholder))
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
      instance.values = values
      const placeholderByOldNode = new Map(placeholdersToUpdate.map(placeholder => [placeholdersNodes.get(placeholder), placeholder]))
      const updateResults = new Map(placeholdersToUpdate.map(placeholder => {
        const result = update[placeholder.type]({
          placeholder,
          values,
          data: placeholdersData.get(placeholder),
          [placeholder.type === 'text' ? 'nodes' : 'node']: placeholdersNodes.get(placeholder),
          placeholderByIndex,
          _childNodes: instance._childNodes,
          setChildNodes: _childNodes => {
            // work but isn't doing the job(it's useless code)
            // patchDomArray(flattenArray(newChildNodes), flattenArray(childNodes))
            // const oldChildNodes = childNodes
            // childNodes = newChildNodes
            // for (const listener of listeners) listener(newChildNodes, oldChildNodes)
            //
            // should work ?
            // patchDomArray(flattenArray(_childNodes), flattenArray(childNodes))
            // const oldChildNodes = childNodes
            // childNodes = _childNodes
            // for (const listener of listeners) listener(_childNodes, oldChildNodes)
            //
            // old
            // childNodes = _childNodes
            // patchDomArray(flattenArray(newChildNodes), flattenArray(childNodes))
            // for (const listener of listeners) listener(newChildNodes, oldChildNodes)
          }
        })
        if ((result.node || result.nodes) === placeholdersNodes.get(placeholder)) return [placeholder, result]
        if (placeholder.type === 'tag' || placeholder.type === 'attribute') {
          if (placeholder.tag && placeholder.tag.length) {
            placeholdersNodes = newPlaceholdersNodes(placeholdersNodes, placeholderByIndex[placeholder.tag[0]], result.node)
          }
          for (const attrIndex of placeholder.attributes) {
            placeholdersNodes = newPlaceholdersNodes(placeholdersNodes, placeholderByIndex[attrIndex[0]], result.node)
          }
        }
        placeholdersNodes = newPlaceholdersNodes(placeholdersNodes, placeholder, placeholder.type === 'text' ? result.nodes : result.node)
        return [placeholder, result]
      }))
      placeholdersData = new Map([...placeholdersData].map(([placeholder, data]) => [placeholder,
        updateResults.has(placeholder)
        ? updateResults.get(placeholder).data
        : data
      ]))
      // =======================================RECODE THIS PART=======================================
      const oldNodeByPlaceholder = new Map([...placeholderByOldNode].map(([node, placeholder]) => [placeholder, node]))
      for (const [placeholder, updateResult] of [...updateResults].filter(([placeholder]) => placeholder.type === 'text')) {
        patchDomArray(flattenArray(updateResult.nodes), flattenArray(oldNodeByPlaceholder.get(placeholder)))
      }
      for (const [placeholder, updateResult] of [...updateResults].filter(([placeholder]) => placeholder.type !== 'text')) {
        const oldNode = oldNodeByPlaceholder.get(placeholder)
        if (oldNode && oldNode.parentNode) oldNode.parentNode.insertBefore(updateResult.node, oldNode)
      }
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
      // =======================================/RECODE THIS PART/=======================================
      const oldChildNodes = childNodes
      childNodes = newChildNodes
      for (const listener of listeners) listener(newChildNodes, oldChildNodes)
    },
    listen (func) {
      listeners = [...listeners, func]
      return _ => (listeners = Object.assign([...listeners], {[listeners.indexOf(func)]: undefined}).filter(item => item))
    }
  }
  const textPlaceholdersByFirstNode = new Map(placeholders.filter(({type}) => type === 'text').map(placeholder => [placeholdersNodes.get(placeholder)[0], placeholder]))
  childNodes = childNodes.reduce((arr, node) =>
    textPlaceholdersByFirstNode.has(node)
    ? [...arr, placeholdersNodes.get(textPlaceholdersByFirstNode.get(node))]
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

export const htmlTemplate = transform => (strings, ...values) => {
  const id = strings.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  const { html, placeholders } = parsePlaceholders({htmlArray: split(transform(mergeSplitWithPlaceholders(strings))).filter((str, i) => !(i % 2)), values})
  const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder) => [...arr,
    ...placeholder.type === 'text'
    ? placeholder.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
    : [placeholder]
  ], [])
  const build = createBuild({ id, html, placeholders: placeholdersWithFixedTextPlaceholders })
  cache.set(id, build)
  return build(values)
}

export const html = htmlTemplate(str => str)

const update = {
  comment ({ values, node, placeholder: { split } }) {
    node.nodeValue = mergeSplitWithValues(split, values)
    return {node}
  },
  text ({
    value,
    values,
    _childNodes,
    setChildNodes,
    nodes = [],
    data: { instance: oldInstance, unlisten: oldUnlisten, textArray: oldTextArray = [] } = {},
    placeholder: { index } = {}
  }) {
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
    } else if (value && value.build) {
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
      // todo: add more of the parameters to cover all of the simple text features
      const textArray = value.map((value, i) => {
        const oldText = oldTextArray[i]
        const text = update.text({
          value,
          nodes: oldText && oldText.nodes,
          data: oldText && oldText.data
        })
        return text
      })
      return { nodes: textArray.map(({nodes}) => nodes), data: { textArray } }
    } else {
      return { nodes: [ nodes[0] instanceof Comment ? nodes[0] : new Comment('') ] }
    }
  },
  tag ({ values, node: _node, placeholderByIndex, placeholder: { attributes, split } }) {
    const node = document.createElement(mergeSplitWithValues(split, values))
    for (const {name, value} of _node.attributes) node.setAttribute(name, value)
    for (const childNode of _node.childNodes) node.appendChild(childNode)
    return {node}
  },
  attribute ({ values, placeholder, node, data: { oldName } = {}, placeholder: { attributeType, nameSplit, valueSplit } }) {
    // todo: add event listeners feature
    const name = mergeSplitWithValues(nameSplit, values)
    const value = attributeType === '' ? values[valueSplit[1]] : mergeSplitWithValues(valueSplit, values) // mergeSplitWithValues(valueSplit, values)
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
