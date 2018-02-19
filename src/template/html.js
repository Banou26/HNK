import { reactify } from '../reactivity/index.js'
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
        const rightNode = placeholderNode.nodeValue.length ? placeholderNode.splitText(0) : null
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
  return [...paths].map(([placeholder, path]) => ({...placeholder, path, data: []}))
}

const createInstance = ({ id, template, placeholders: _placeholders }, ...values) => {
  const doc = document.importNode(template.content, true)
  const placeholders = getPlaceholderWithNodes(doc, _placeholders)
  const placeholderByIndex = indexPlaceholders(placeholders)
  const childNodes = reactify([...doc.childNodes])
  for (const placeholder of placeholders.filter(({type}) => type === 'text')) {
    const index = childNodes.indexOf(placeholder.nodes[0])
    if (index === -1) continue
    childNodes.splice(index, 1, placeholder.nodes)
    if (placeholder.nodes !== childNodes[index]) placeholder.nodes = childNodes[index]
  }
  let bypassDif = true
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
      const valueIndexDifs = getValueIndexDifferences(values, instance.values)
      const placeholdersToUpdate = valueIndexDifs.map(i => placeholderByIndex[i]).filter(elem => elem)
      const placeholdersNewNodes = new Map((bypassDif ? placeholders : placeholdersToUpdate).map(placeholder =>
        [
          placeholder,
          update[placeholder.type]({
            instance,
            placeholder,
            placeholders,
            values,
            placeholderByIndex
          })
        ]
      ))
      for (const [placeholder, newNode] of placeholdersNewNodes) {
        const nodeStr = placeholder.type === 'text' ? 'nodes' : 'node'
        if (placeholder[nodeStr] === newNode) continue
        const index = childNodes.indexOf(placeholder.node || placeholder.nodes)
        if (index !== -1) {
          placeholder[nodeStr] = newNode
          childNodes.splice(index, 1, placeholder[nodeStr])
          if (placeholder[nodeStr] !== childNodes[index]) placeholder[nodeStr] = childNodes[index]
        }
      }
    }
  }
  childNodes.$watch(_ => {
    const lastNode = instance.childNodes[instance.childNodes.length - 1]
    if (!lastNode) return
    const insertBeforeNode = lastNode.nextSibling
    const parent = lastNode.parentElement
    if (!parent) return
    if (insertBeforeNode) parent.insertBefore(instance.content, insertBeforeNode)
    else parent.appendChild(instance.content)
  })
  instance.update(...values, true)
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

const update = {
  comment (ctx) {
    const { values, placeholder: { node, split } } = ctx
    node.nodeValue = mergeSplitWithValues(split, values)
    return node
  },
  text (ctx) {
    const { values, placeholder, placeholder: { nodes: _nodes, index, data: _data } } = ctx
    const value = values[index]
    const dataValue = _data[index]
    const data = Object.assign([..._data], {[index]: []})
    let nodes = []
    if (typeof value === 'string') {
      if (_nodes[0] instanceof Text) {
        if (_nodes[0].nodeValue !== value) _nodes[0].nodeValue = value
        nodes = [_nodes[0]]
      } else {
        nodes = [new Text(value)]
      }
    } else if (value instanceof Node) {
      if (nodes[0] !== value) nodes = [value]
    } else if (value.build) {
      const build = value
      const instance = dataValue
      if (instance && instance.id === build.id) {
        instance.update(...build.values)
        nodes = instance._childNodes
      } else {
        nodes = (data[index] = build())._childNodes
      }
    } else if (Array.isArray(value)) {

    }
    placeholder.data = data
    return nodes
  },
  tag (ctx) {
    const { instance, placeholder, placeholders, values, placeholderByIndex, placeholder: { node } } = ctx
    const newNode = document.createElement(mergeSplitWithValues(placeholder.split, values))
    for (const {name, value} of node.attributes) newNode.setAttribute(name, value)
    for (const attrIndex of placeholder.attributes) {
      const attrPlaceholder = placeholderByIndex[attrIndex[0]]
      attrPlaceholder.node = newNode
      update.attribute({instance, placeholder: attrPlaceholder, placeholders, values, placeholderByIndex})
    }
    return newNode
  },
  attribute (ctx) {
    const { values, placeholder, placeholder: { attributeType, node, nameSplit, valueSplit, oldName } } = ctx
    const name = mergeSplitWithValues(nameSplit, values)
    const value = mergeSplitWithValues(valueSplit, values)
    if (attributeType === 0) { // double-quote
      if (oldName) node.removeAttribute(oldName)
      node.setAttribute(name, value)
    } else if (attributeType === 1) {  // single-quote
      if (oldName) node.removeAttribute(oldName)
      node.setAttribute(name, value)
    } else if (attributeType === 2) {  // no-quote
      node[name] = value
    }
    placeholder.oldName = name
    return node
  }
}
