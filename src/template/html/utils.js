import { comment as makeComment, element as makeElement, text as makeText } from './types/index.js'
import { placeholderRegex, placeholder as toPlaceholder } from '../utils.js'

// const getSplitIds = split => split.filter((str, i) => i % 2)
// const execSplit = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('')
// const indexToPlaceholder = (placeholders) => {
//   const arr = []
//   for (const placeholder of placeholders) {
//     for (const id of placeholder.ids) arr.push(placeholder) // eslint-disable-line no-unused-vars
//   }
//   return arr
// }
// const valuesDif = (values, values2) => {
//   let dif = []
//   const highestLength = values.length > values2.length ? values.length : values2.length
//   for (let i = 0; i < highestLength; i++) {
//     if (values[i] !== values2[i]) dif.push(i)
//   }
//   return dif
// }

// export const getSiblingIndex = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex(previousSibling, i + 1) : i

// export const getNodePath2 = ({node, node: {parentElement: parent} = {}, path = []}) =>
//   parent
//     ? getNodePath({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
//     : [...path, getSiblingIndex(node)].reverse()

// export const getNodePath = ({ node, node: { parentNode: parent } = {}, path = [] }) =>
//   parent
//     ? getNodePath({ node: parent, path: path.concat(Array.from(parent.childNodes).indexOf(node)) })
//     : path.reverse()

export const replaceNodes = (oldNodes, newNodes) => {
  for (const i in newNodes) {
    // `oldNode` can be undefined if the number of
    // new nodes is larger than the number of old nodes
    const oldNode = oldNodes[i]
    const newNode = newNodes[i]
    if (oldNode !== newNode) {
      if (oldNode) {
        oldNode.parentNode.insertBefore(newNode, oldNode)
        oldNode.remove()
      } else { // Will place the new node after the previous newly placed new node
        const previousNewNode = newNodes[i - 1]
        const { parentNode } = previousNewNode
        parentNode.insertBefore(newNode, previousNewNode.nextSibling)
        if (oldNode) oldNode.remove()
      }
    }
  }
  for (const node of oldNodes.filter(node => !newNodes.includes(node))) node.remove()
}

export const getNodePath = (node, path = [], { parentNode: parent } = node) =>
  parent
    ? getNodePath(parent, path.concat(Array.from(parent.childNodes).indexOf(node)))
    : path.reverse()

export const walkPlaceholders = ({html, element, text, comment}) => {
  const template = document.createElement('template')
  template.innerHTML = html
  const walker = document.createTreeWalker(template.content,
    (element ? NodeFilter.SHOW_ELEMENT : 0) +
    (comment ? NodeFilter.SHOW_COMMENT : 0) +
    (text ? NodeFilter.SHOW_TEXT : 0), {
      acceptNode: ({nodeType, outerHTML, innerHTML, data}) =>
        nodeType === Node.ELEMENT_NODE
          ? outerHTML.replace(innerHTML, '').match(placeholderRegex)
            ? NodeFilter.FILTER_ACCEPT
            : innerHTML.match(placeholderRegex)
              ? NodeFilter.FILTER_SKIP
              : NodeFilter.FILTER_REJECT
          : (nodeType === Node.TEXT_NODE || nodeType === Node.COMMENT_NODE) && data.match(placeholderRegex)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
    })
  while (walker.nextNode()) {
    const { currentNode, currentNode: { nodeType } } = walker
    if (nodeType === Node.ELEMENT_NODE) element(currentNode)
    else if (nodeType === Node.TEXT_NODE) text(currentNode)
    else if (nodeType === Node.COMMENT_NODE) comment(currentNode)
  }
  return template.content
}

export const placeholdersMetadataToPlaceholders = ({ template, placeholdersMetadata, fragment }) => {
  const childNodes = Array.from(fragment.childNodes)
  const placeholders = []
  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i]
    const { type, path } = placeholderMetadata
    const node = type === 'element' || type === 'attribute'
      ? fragment.querySelector(toPlaceholder(i))
      : path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], fragment)
    const arrayFragment = [node]
    if (childNodes.includes(node)) childNodes.splice(childNodes.indexOf(node), 1, arrayFragment)
    if (type === 'element' || type === 'attribute') placeholders.push(makeElement({ template, placeholderMetadata, arrayFragment }))
    else {
      const placeholder = (type === 'text' ? makeText : makeComment)({ template, placeholderMetadata, arrayFragment })
      placeholder.metadata = placeholderMetadata
      placeholder.arrayFragment = arrayFragment
      placeholders.push(placeholder)
    }
  }
  return {
    childNodes,
    placeholders
  }
}