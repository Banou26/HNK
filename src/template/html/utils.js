import { comment as makeComment, element as makeElement, text as makeText } from './types/index.js'
import { placeholderRegex, placeholder as toPlaceholder } from '../utils.js'

export const OzHTMLReference = Symbol.for('OzHTMLReference')
export const OzHTMLReferencePath = Symbol.for('OzHTMLReferencePath')

export const replaceReferencesByValues = (values, references) =>
  values
    .map(val =>
      val?.[OzHTMLReference]
        ? val[OzHTMLReferencePath]
            .reduce((val, prop) => val[prop], references.get(val[OzHTMLReference]))
        : val)

export const replaceNodes = (oldNodes, newNodes) => {
  for (const i in newNodes) {
    // `oldNode` can be undefined if the number of
    // new nodes is larger than the number of old nodes
    const oldNode = oldNodes[i]
    const newNode = newNodes[i]
    if (oldNode !== newNode) {
      if (oldNode) {
        oldNode.parentNode.insertBefore(newNode, oldNode)
        if (newNodes[i + 1] !== oldNode) oldNode.remove()
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
    const { type, path, ids } = placeholderMetadata
    if (type === 'endTag') continue
    const node = type === 'startTag' || type === 'attribute'
      ? fragment.querySelector(`[${toPlaceholder(ids[0])}]`)
      : path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], fragment)
    const arrayFragment = [node]
    if (childNodes.includes(node)) childNodes.splice(childNodes.indexOf(node), 1, arrayFragment)
    let placeholder =
      (type === 'text'
        ? makeText
        : type === 'comment'
          ? makeComment
          : makeElement /* type === 'startTag' || type === 'attribute' */
      )({ template, placeholderMetadata, arrayFragment })
    placeholder.metadata = placeholderMetadata
    placeholder.arrayFragment = arrayFragment
    placeholders.push(placeholder)
  }
  return {
    childNodes,
    placeholders
  }
}
