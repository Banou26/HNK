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

const createInstance = ({ id, template, placeholders }, ...values) => {
  const doc = document.importNode(template.content, true)
  let bypassDif = true
  let childNodes = [...doc.childNodes]
  let listeners = []
  let placeholdersNodes = new Map(placeholders.map(placeholder => (
    [
      placeholder,
      placeholder.type === 'text' ? [getNode(doc, placeholder.path)] : getNode(doc, placeholder.path)
    ]
  )))
  let placeholdersData = new Map(placeholders.map(placeholder => [placeholder, {}]))
  let placeholderByIndex = indexPlaceholders(placeholders)

  const updatePlaceholder = ({ values, placeholder }) => {
    const currentData = placeholdersData.get(placeholder)
    if (currentData && currentData.directive) currentData.directive() // cleanup directive function
    const index = placeholder.index || placeholder.indexes[0]
    const directive = values[index]
    const data = placeholdersData.get(placeholder)
    const node = placeholdersNodes.get(placeholder)

    const replaceNode = (newNode, node) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newNode]]
        .map(([_placeholder, _node]) => node === _node
        ? [_placeholder, newNode]
        : [_placeholder, _node])
      )
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(node)]: newNode})
      const { parentNode } = node
      if (parentNode) {
        parentNode.insertBefore(newNode, node)
        parentNode.removeChild(node)
      }
    }

    const replaceNodes = (newArray, oldArray) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newArray]])
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(oldArray)]: newArray})
      newArray = flattenArray(newArray)
      oldArray = flattenArray(oldArray)
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

    const setElement = newElement => {
      const element = placeholdersNodes.get(placeholder)
      const elementPlaceholders = placeholder.attributes.map(indexes => placeholderByIndex[indexes[0]])
      for (const {name, value} of element.attributes) newElement.setAttribute(name, value)
      for (const childNode of element.childNodes) newElement.appendChild(childNode)
      replaceNode(newElement, element)
      for (const placeholder of elementPlaceholders) updatePlaceholder({values, placeholder})
    }
    if (placeholder.type === 'attribute' && placeholder.indexes.length === 1 && directive && directive.directive) { // placeholder value is a directive
      placeholdersData = new Map([...placeholdersData, [
        placeholder,
        { directive: directive({ getElement: placeholdersNodes.get.bind(placeholdersNodes, placeholder), setElement }) }
      ]])
    } else {
      const updateResult = update[placeholder.type]({
        placeholder,
        values,
        data,
        [placeholder.type === 'text' ? 'nodes' : 'node']: node,
        placeholderByIndex,
        getChildNodes () { return instance._childNodes },
        setChildNodes: newChildNodes => {
          const _childNodes = childNodes
          childNodes = newChildNodes
          for (const listener of listeners) listener(childNodes, _childNodes)
        }
      })
      if (placeholder.type === 'text') {
        if (node !== updateResult.nodes) replaceNodes(updateResult.nodes, node)
      } else if (placeholder.type === 'tag' || placeholder.type === 'attribute') {
        if (node !== updateResult.node) setElement(updateResult.node)
      } else {
        if (node !== updateResult.node) replaceNode(updateResult.node, node)
      }
      placeholdersData = new Map([...placeholdersData, [placeholder, updateResult.data]])
    }
    for (const listener of listeners) listener(childNodes, node)
  }

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
      instance.values = values
      for (const placeholder of placeholdersToUpdate) updatePlaceholder({placeholder, values})
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
    return { node }
  },
  text ({
    value,
    values,
    getChildNodes,
    setChildNodes,
    nodes = [],
    data: { instance: oldInstance, unlisten: oldUnlisten, textArray: oldTextArray = [] } = {},
    placeholder: { index } = {}
  }) {
    if (oldUnlisten) oldUnlisten()
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
        const instance = value()
        const unlisten = instance.listen((newChildNodes, oldChildNodes) => {
          setChildNodes(newChildNodes)
          // const currentChildNodes = getChildNodes()
          // setChildNodes(Object.assign([...currentChildNodes], {[currentChildNodes.indexOf(oldChildNodes)]: newChildNodes}))
        })
        return { nodes: instance._childNodes, data: { instance, unlisten } }
      }
    } else if (value && value.instance) {
      const unlisten = value.listen((newChildNodes, oldChildNodes) => {
        setChildNodes(newChildNodes)
      })
      return { nodes: value._childNodes, data: { instance: value, unlisten } }
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
  tag: ({ values, node, placeholder: { split } }) => {
    const newTag = mergeSplitWithValues(split, values)
    return {
      node: node.tagName.toLowerCase() === newTag.toLowerCase()
        ? node
        : document.createElement(newTag)
    }
  },
  attribute ({ values, placeholder, node, data: { name: oldName, listener: oldListener, value: oldValue } = {}, placeholder: { attributeType, nameSplit, valueSplit } }) {
    if (oldListener) node.removeEventListener(oldName, oldValue)
    const name = mergeSplitWithValues(nameSplit, values)
    const value = attributeType === '' ? values[valueSplit[1]] : mergeSplitWithValues(valueSplit, values) // mergeSplitWithValues(valueSplit, values)
    if (attributeType === '"') { // double-quote
      node.setAttribute(name, value)
    } else if (attributeType === '\'') {  // single-quote
      node.setAttribute(name, value)
    } else if (attributeType === '') {  // no-quote
      let isEvent = name.startsWith('on-') ? 1 : name.startsWith('@') ? 2 : 0
      if (isEvent) { // Event handling
        const listenerName = name.substring(isEvent === 1 ? 3 : 1)
        const listener = node.addEventListener(listenerName, value)
        return { node, data: { name, listener, value } }
      } else {
        node[name] = value
      }
    }
    return {node, data: { name }}
  }
}
