export * from './html.js'

const envCachesTemplates = (t => t() === t())(_ => (s => s)``)
const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
const placeholderRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`)
const placeholderRegexGlobal = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')

const isBuild = value =>
  value.hasOwnProperty('id') &&
  value.hasOwnProperty('values')

const isInstance = value =>
  value.hasOwnProperty('id') &&
  value.hasOwnProperty('values') &&
  value.hasOwnProperty('update') &&
  value.hasOwnProperty('content') &&
  value.hasOwnProperty('childNodes') &&
  value.hasOwnProperty('_childNodes')

const placeholderStr = id => `oz-template-placeholder-${id}-${random}`

const split = str => str.split(placeholderRegexGlobal)

const getSplitIds = split => split.filter((str, i) => i % 2)

const execSplit = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('')

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
  for (const placeholder of placeholders.filter(({type}) => type === 'startTagName' || type === 'attribute' || type === 'property')) {
    const attributeName = placeholderStr(placeholder.ids[0])
    const foundNode = node.querySelector(`[${attributeName}]`)
    foundNode.removeAttribute(attributeName)
    placeholder.path = getNodePath(foundNode)
  }
}

function indexToPlaceholder (placeholders) {
  const arr = []
  for (const placeholder of placeholders) {
    for (const id of placeholder.ids) arr.push(placeholder) // eslint-disable-line no-unused-vars
  }
  return arr
}

const valuesDif = (values, values2) => {
  let dif = []
  const highestLength = values.length > values2.length ? values.length : values2.length
  for (let i = 0; i < highestLength; i++) {
    if (values[i] !== values2[i]) dif.push(i)
  }
  return dif
}

export function template (parser, options) {
  const cache = new Map()
  return (strings, ...values) => {
    const id = envCachesTemplates ? strings : strings.join(placeholderStr(''))
    const cached = cache.get(id)
    if (cached) return cached(...values)
    const src = strings[0] + [...strings].splice(1).map((str, i) => placeholderStr(i) + str).join('')
    const { placeholders, html } = parser(src, values, { placeholderStr, placeholderRegex, placeholderRegexGlobal, split, getSplitIds, execSplit })
    const pointerArray = indexToPlaceholder(placeholders)
    const template = document.createElement('template')
    template.innerHTML = html
    setPlaceholdersPaths(template.content, placeholders, pointerArray, values)
    const createCachedInstance = (...values) => {
      const createInstance = _ => {
        const docFrag = document.importNode(template.content, true)
        const childNodes = [...docFrag.childNodes]
        const placeholdersInstances = new Map()
        for (const placeholder of placeholders) {
          const isText = placeholder.type === 'text'
          let node = getNode(placeholder.path, docFrag)
          if (isText) {
            node = [node]
            const firstNodeIndex = childNodes.indexOf(node[0])
            if (firstNodeIndex !== -1) childNodes.splice(firstNodeIndex, 1, node)
          }
          placeholdersInstances.set(placeholder, {
            placeholder,
            node,
            values: {}
          })
        }
        const instance = {
          id,
          values: [],
          update (...values) {
            const dif = valuesDif(values, this.values)
            let updated = []
            for (const index of dif) {
              const placeholder = pointerArray[index]
              const placeholderInstance = placeholdersInstances.get(placeholder)
              if (updated.includes(placeholder)) continue
              updated.push(placeholder)
              switch (placeholder.type) {
                case 'attribute':
                  updateAttribute(placeholderInstance, values)
                  break
                case 'property':
                  updateProperty(placeholderInstance, values)
                  break
                case 'text':
                  updateText(placeholderInstance, values, childNodes)
                  break
                case 'startTagName':
                  const dependents = placeholder.dependents || []
                  updated = [...updated, ...dependents]
                  const dependentsInstances = []
                  for (const dependent of dependents) {
                    dependentsInstances.push(placeholdersInstances.get(dependent))
                  }
                  updateElement(placeholderInstance, values, childNodes, dependentsInstances)
                  break
                case 'comment':
                  updateComment(placeholderInstance, values)
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
          }
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

function updateElement (placeholderInstance, values, childNodes, dependentsInstances) {
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

function updateAttribute (placeholderInstance, values) {
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

const updateProperty = (placeholderInstance, values) => {
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
  if (propName.startsWith('on-')) { // Event handling
    const listenerName = propName.substring(3)
    node.addEventListener(listenerName, propValue)
    instanceValues.listenerName = listenerName
    instanceValues.propValue = propValue
  } else {
    node[propName] = propValue
  }
}

const updateComment = (placeholderInstance, values) => {
  const { placeholder, node } = placeholderInstance
  const { splits } = placeholder
  node.nodeValue = execSplit(splits[0], values)
}

function textNewNodes (instanceValues, value) {
  const oldValue = instanceValues.value
  instanceValues.value = value
  let nodes = []
  switch (typeof value) {
    case 'string':
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
      }
      break
  }
  return nodes
}

function updateText (placeholderInstance, values, childNodes) {
  const { placeholder } = placeholderInstance
  const { splits } = placeholder
  const instanceValues = placeholderInstance.values
  const currentNodes = placeholderInstance.node
  let firstCurrentChild = currentNodes[0]
  let firstCurrentChildParent = firstCurrentChild.parentNode
  const value = values[splits[0][1]]
  let newNodes = textNewNodes(instanceValues, value)
  const currentNodesIndex = childNodes.indexOf(currentNodes)
  if (currentNodesIndex !== -1) childNodes.splice(currentNodesIndex, 1, newNodes)
  const nodesToKeep = []
  firstCurrentChild = currentNodes[0]
  firstCurrentChildParent = firstCurrentChild.parentNode
  for (const node of deconstructArray(newNodes)) {
    if (currentNodes.includes(node)) nodesToKeep.push(node)
    firstCurrentChildParent.insertBefore(node, firstCurrentChild)
  }
  for (const node of currentNodes) {
    if (nodesToKeep.includes(node)) continue
    node.parentNode.removeChild(node)
  }
  placeholderInstance.node = newNodes
}
