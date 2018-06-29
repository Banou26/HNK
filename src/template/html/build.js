import { indexPlaceholders, regex as placeholderRegex, split, placeholder as placeholderStr, mergeSplitWithPlaceholders } from './utils.js'
import createInstance from './instance.js'
import parsePlaceholders from './parser.js'

const getSiblingIndex = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex(previousSibling, i + 1) : i

const getNodePath = ({node, node: {parentElement: parent} = {}, path = []}) => parent
  ? getNodePath({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
  : [...path, getSiblingIndex(node)].reverse()

const getPlaceholderWithPaths = (node, _placeholders) => {
  const placeholders = _placeholders.reduce((arr, placeholder) => [...arr, ...placeholder.type === 'text'
    ? [...placeholder.indexes.map(index => ({type: 'text', index}))]
    : [placeholder]]
    , [])
  const placeholderByIndex = indexPlaceholders(placeholders)
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, undefined, false)
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

const createBuild = ({id, html, placeholders: _placeholders}) => {
  const template = document.createElement('template')
  template.innerHTML = html
  if (!template.content.childNodes.length) template.content.appendChild(new Comment())
  const placeholders = getPlaceholderWithPaths(template.content, _placeholders)
  return values => {
    const _createInstance = createInstance({ id, template, placeholders }, ...values)
    _createInstance.build = true
    _createInstance.id = id
    _createInstance.values = values
    return _createInstance
  }
}

const cache = new Map()

export const tag = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings]
  const id = 'html' + strings.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  const { html, placeholders } = parsePlaceholders({htmlArray: split(transform ? transform(mergeSplitWithPlaceholders(strings)) : mergeSplitWithPlaceholders(strings)).filter((str, i) => !(i % 2)), values})
  const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder) => [...arr,
    ...placeholder.type === 'text'
      ? placeholder.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
      : [placeholder]
  ], [])
  const build = createBuild({ id, html, placeholders: placeholdersWithFixedTextPlaceholders })
  cache.set(id, build)
  return build(values)
}
