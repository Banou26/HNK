import {
  envCachesTemplates, placeholderRegex, indexToPlaceholder,
  placeholderRegexGlobal, isBuild, joinSrcWithPlaceholders,
  placeholderStr, split, getSplitIds, execSplit, valuesDif
} from './utils.js'

export * from './html.js'

export const isInstance = value =>
  value.hasOwnProperty('id') &&
  value.hasOwnProperty('values') &&
  value.hasOwnProperty('update') &&
  value.hasOwnProperty('content') &&
  value.hasOwnProperty('childNodes') &&
  value.hasOwnProperty('_childNodes')

const deconstructArray = arr => {
  for (const item of arr) {
    if (Array.isArray(item)) arr.splice(arr.indexOf(item), 1, ...item)
  }
  return arr
}

function getNodePath (node) {
  let path = []
  let parent = node.parentNode
  if (parent) {
    while (parent) {
      path.push([...parent.childNodes].indexOf(node))
      node = parent
      parent = node.parentNode
    }
  } else {
    let index = 0
    let previousNode = node.previousSibling
    while (previousNode) {
      index++
      previousNode = node.previousSibling
    }
    path.push(index)
  }
  return path.reverse()
}

const getNode = (path, rootNode) => path.reduce((currNode, i) => currNode.childNodes.item(i), rootNode)

function setPlaceholdersPaths (node, placeholders, pointerArray, values) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, null, false)
  const nodes = new Map()
  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    const match = currentNode.nodeValue.match(placeholderRegex)
    if (match) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const placeholderNode = currentNode.splitText(match.index)
        nodes.set(pointerArray[match[1]], placeholderNode)
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length)
        placeholderNode.splitText(0)
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        nodes.set(pointerArray[match[1]], currentNode)
      }
    }
  }
  for (const [placeholder, node] of nodes) {
    placeholder.path = getNodePath(node)
  }
  for (const placeholder of placeholders) {
    const type = placeholder.type
    if (type === 'attribute' || type === 'property' || type === 'startTagName') {
      const attributeName = placeholderStr(placeholder.ids[0])
      const foundNode = node.querySelector(`[${attributeName}]`)
      foundNode.removeAttribute(attributeName)
      placeholder.path = getNodePath(foundNode)
    }
  }
}

export function htmlTemplate (parser, options) {
  const cache = new Map()
  return (strings, ...values) => {
    const id = envCachesTemplates ? strings : strings.join(placeholderStr(''))
    const cached = cache.get(id)
    if (cached) return cached(...values)
    const { placeholders, html } = parser(strings, values, {
      placeholderStr,
      placeholderRegex,
      placeholderRegexGlobal,
      split,
      getSplitIds,
      execSplit,
      joinSrcWithPlaceholders
    })
    const pointerArray = indexToPlaceholder(placeholders)
    const template = document.createElement('template')
    template.innerHTML = html
    setPlaceholdersPaths(template.content, placeholders, pointerArray, values)
    const createCachedInstance = (...values) => {
      const createInstance = _ => {
        const docFrag = document.importNode(template.content, true)
        const childNodes = [...docFrag.childNodes]
        const placeholdersInstances = new Map()
        const instance = {
          id,
          values: [],
          update (...values) {
            const dif = valuesDif(values, this.values)
            this.values = values
            let updated = []
            for (const index of dif) {
              const placeholder = pointerArray[index]
              const placeholderInstance = placeholdersInstances.get(placeholder)
              const value = values[index]
              if (typeof value === 'function' && placeholder.type !== 'property' && !isBuild(value)) {
                value(val => {
                  const { instance } = placeholderInstance
                  const vals = [...instance.values]
                  vals[index] = val
                  instance.update(...vals)
                })
                return
              }
              if (updated.includes(placeholder)) continue
              updated.push(placeholder)
              switch (placeholder.type) {
                case 'attribute':
                  updateAttribute(placeholderInstance, values, index)
                  break
                case 'property':
                  updateProperty(placeholderInstance, values, index)
                  break
                case 'text':
                  updateText(placeholderInstance, values, childNodes, index)
                  break
                case 'startTagName':
                  const dependents = placeholder.dependents || []
                  updated = [...updated, ...dependents]
                  const dependentsInstances = []
                  for (const dependent of dependents) {
                    dependentsInstances.push(placeholdersInstances.get(dependent))
                  }
                  updateElement(placeholderInstance, values, childNodes, dependentsInstances, index)
                  break
                case 'comment':
                  updateComment(placeholderInstance, values, index)
                  break
              }
            }
          },
          _childNodes: childNodes,
          get childNodes () {
            return deconstructArray(this._childNodes)
          },
          get content () {
            for (const node of this.childNodes) docFrag.appendChild(node)
            return docFrag
          },
          __reactivity__: false
        }
        for (const placeholder of placeholders) {
          const isText = placeholder.type === 'text'
          let node = getNode(placeholder.path, docFrag)
          if (isText) {
            node = [node]
            const firstNodeIndex = childNodes.indexOf(node[0])
            if (firstNodeIndex !== -1) childNodes.splice(firstNodeIndex, 1, node)
          }
          placeholdersInstances.set(placeholder, {
            instance,
            placeholder,
            node,
            values: {}
          })
        }
        instance.update(...values)
        return instance
      }
      createInstance.id = id
      createInstance.values = values
      return createInstance
    }
    cache.set(id, createCachedInstance)
    return createCachedInstance(...values)
  }
}

function updateElement (placeholderInstance, values, childNodes, dependentsInstances, index) {
  const { placeholder, node } = placeholderInstance
  const { splits } = placeholder
  // const instanceValues = placeholderInstance.values
  const newTagName = execSplit(splits[0], values)
  // instanceValues.name = newTagName
  const newElem = document.createElement(newTagName)
  const parent = node.parentNode
  placeholderInstance.node = newElem
  if (parent) {
    parent.insertBefore(newElem, node)
    parent.removeChild(node)
  }
  if (node.hasAttributes()) {
    for (const {name, value} of node.attributes) {
      newElem.setAttribute(name, value)
    }
  }
  const nodeIndex = childNodes.indexOf(node)
  if (nodeIndex !== -1) childNodes.splice(nodeIndex, 1, newElem)
  while (node.firstChild) newElem.appendChild(node.firstChild)
  for (const dependentInstance of dependentsInstances) {
    dependentInstance.node = newElem
    if (dependentInstance.placeholder.type === 'attribute') {
      updateAttribute(dependentInstance, values)
    } else if (dependentInstance.placeholder.type === 'property') {
      updateProperty(dependentInstance, values)
    }
  }
}

function updateAttribute (placeholderInstance, values, index) {
  const { placeholder, node } = placeholderInstance
  const { splits } = placeholder
  const instanceValues = placeholderInstance.values
  const oldName = instanceValues.name
  const newAttributeName = execSplit(splits[0], values)
  const newAttributeValue = execSplit(splits[1], values)
  if (oldName && oldName !== newAttributeName) node.removeAttribute(oldName)
  instanceValues.name = newAttributeName
  node.setAttribute(newAttributeName, newAttributeValue)
}

const updateProperty = (placeholderInstance, values, index) => {
  const { placeholder, node } = placeholderInstance
  const { splits } = placeholder
  const instanceValues = placeholderInstance.values
  if (instanceValues.listenerName && instanceValues.propValue) {
    node.removeEventListener(instanceValues.listenerName, instanceValues.propValue)
    instanceValues.listenerName = null
    instanceValues.propValue = null
  }
  const propName = execSplit(splits[0], values)
  const propValue = values[splits[1][1]]
  let isEvent = propName.startsWith('on-') ? 1 : propName.startsWith('@') ? 2 : 0
  if (isEvent) { // Event handling
    const listenerName = propName.substring(isEvent === 1 ? 3 : 1)
    node.addEventListener(listenerName, propValue)
    instanceValues.listenerName = listenerName
    instanceValues.propValue = propValue
  } else {
    node[propName] = propValue
  }
}

const updateComment = (placeholderInstance, values, index) => {
  const { placeholder, node } = placeholderInstance
  const { splits } = placeholder
  node.nodeValue = execSplit(splits[0], values)
}

const textNewNodes = (instanceValues, value, index) => {
  const oldValue = instanceValues.value
  instanceValues.value = value
  let nodes = []
  switch (typeof value) {
    case 'string':
      nodes = [new Text(value)]
      break
    case 'number':
      nodes = [new Text(value)]
      break
    case 'object':
      if (value instanceof Node) {
        nodes = [value]
      } else if (Array.isArray(value)) {
        instanceValues.arrValues = {}
        for (const val of value) {
          nodes = [...nodes, ...textNewNodes(instanceValues.arrValues, val)]
        }
      } else if (value === null) {
        nodes = [new Comment('')]
      }
      break
    case 'function':
      if (isBuild(value)) {
        const build = value
        if (oldValue && isInstance(oldValue) && oldValue.id === build.id) {
          oldValue.update(...build.values)
          nodes = oldValue._childNodes
        } else {
          const instance = build()
          instanceValues.value = instance
          nodes = instance._childNodes
        }
      } else {

      }
      break
    default:
      nodes = [new Comment('')]
      break
  }
  return nodes
}

const updateText = (placeholderInstance, values, childNodes, index) => {
  const { placeholder } = placeholderInstance
  const { splits } = placeholder
  const instanceValues = placeholderInstance.values
  const currentNodes = placeholderInstance.node
  const value = values[splits[0][1]]
  let firstCurrentChild = currentNodes[0]
  let firstCurrentChildParent = firstCurrentChild.parentNode
  let newNodes = textNewNodes(instanceValues, value)
  const currentNodesIndex = childNodes.indexOf(currentNodes)
  if (currentNodesIndex !== -1) childNodes.splice(currentNodesIndex, 1, newNodes)
  const nodesToKeep = []
  firstCurrentChild = currentNodes[0]
  firstCurrentChildParent = firstCurrentChild.parentNode
  for (const node of deconstructArray(newNodes)) {
    if (currentNodes.includes(node)) nodesToKeep.push(node)
    if (firstCurrentChildParent) firstCurrentChildParent.insertBefore(node, firstCurrentChild)
  }
  for (const node of currentNodes) {
    if (nodesToKeep.includes(node)) continue
    if (node.parentNode) node.parentNode.removeChild(node)
  }
  placeholderInstance.node = newNodes
}
