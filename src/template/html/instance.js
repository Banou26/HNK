import { indexPlaceholders } from './utils.js'
import comment from './comment.js'
import text from './text.js'
import tag from './tag.js'
import attribute from './attribute.js'

const update = {
  comment,
  text,
  tag,
  attribute
}

const getNode = (node, path) => path.reduce((currNode, i) => currNode.childNodes.item(i), node)

const flattenArray = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray(item)] : [...arr, item], [])

const replaceArray = (arr, target, replacement) => arr.reduce((arr, item) => [...arr,
  target === item
  ? replacement
  : Array.isArray(item)
    ? replaceArray(item, target, replacement)
    : item
], [])

const getValueIndexDifferences = (arr, arr2) => arr2.length > arr.length
  ? getValueIndexDifferences(arr2, arr)
  : arr.reduce((arr, item, i) =>
    [
      ...arr,
      ...item !== arr2[i] ? [i] : []
    ], [])

export default ({ id, template, placeholders }, ...values) => {
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
