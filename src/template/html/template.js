import { comment as makeComment, element as makeElement, text as makeText } from './types/index.js'
import { placeholder as toPlaceholder, charToN } from '../utils.js'
const templates = new Map()

export default ({templateId, html, values, placeholders: placeholdersMetadata}) => {
  const template = templates.get(templateId) || document.createElement('template')
  if (!templates.has(templateId)) {
    template.innerHTML = html
    templates.set(templateId, template)
  }
  const nodeList = Array.from(template.childNodes)
  const placeholders = []
  const nodes = new Map()
  for (const i in placeholdersMetadata) {
    const { type, path } = placeholdersMetadata[i]
    if (type === 'element' || type === 'attribute') {
      const node = template.querySelector(toPlaceholder(i))
      if (!Array.from(nodes.values()).includes(node)) nodes.set(i, node) && placeholders.push(makeElement(node))
    } else {
      const node = path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], template.content)
      console.log('node', node, path)
      nodes.set(i, node)
      placeholders.push((type === 'text'
        ? makeText
        : makeComment)(node))
    }
  }
  console.log(placeholdersMetadata, nodes, placeholders)
  placeholdersMetadata
    .filter(({type}) => type === 'text')
    .forEach((metadata, i) => {
      const node = nodes.get(i)
      const match = node.data.indexOf(charToN(i))
      const placeholderNode = node.splitText(match.index)
      placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length)
      if (placeholderNode.nodeValue.length) placeholderNode.splitText(0)
      if (!node.nodeValue.length) node.remove()
      nodes.set(i, placeholderNode)
    })
  console.log(template.content.childNodes, placeholders)
  return {
    get content () {

    },
    resetPosition () {

    }
  }
}
