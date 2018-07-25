import { placeholderRegex, placeholder, charToN } from '../utils.js'

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

const nodeFilter = NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT

const analyzeTags = ({transform, strings, values}) => {
  const preHTML = transform(strings.reduce((str, str2, i) => str + placeholder(i) + str2))
  const template = document.createElement('template')
  template.innerHTML = preHTML
  const walker = document.createTreeWalker(template, NodeFilter.SHOW_ELEMENT, { acceptNode: ({nodeType, outerHTML, innerHTML, data}) =>
    outerHTML.replace(innerHTML, '').match(placeholderRegex)
      ? NodeFilter.FILTER_ACCEPT
      : innerHTML.match(placeholderRegex)
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_REJECT
  })
  const placeholderIndexes = []
  const tagPlaceholders = []
  while (walker.nextNode()) {
    const { currentNode: node } = walker
    const { nodeName } = node
    const arr = nodeName
      .match(placeholderRegex)
      .map(char => ({ index: charToN(char), node }))
    tagPlaceholders.push(...arr)
    placeholderIndexes.push(...arr.map(({index}) => index))
  }
  return {
    html: transform(strings.reduce((str, str2, i) => str + placeholder(placeholderIndexes.includes(i) ? i : undefined) + str2)),
    indexes: placeholderIndexes
  }
}

export default ({transform, strings, values}) => {
  const { html, indexes } = analyzeTags({transform, strings, values})
  console.log(html, indexes)
  const placeholders = []
  const template = document.createElement('template')
  template.innerHTML = html
  const walker = document.createTreeWalker(template, nodeFilter, { acceptNode: ({nodeType, outerHTML, innerHTML, data}) =>
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
    const { currentNode: node } = walker
    const { nodeType } = node
    if (nodeType === Node.ELEMENT_NODE) {
      const { nodeName, attributes } = node
      const hasPlaceholderName = nodeName.match(placeholderRegex)
      for (const attr of attributes) {
        const { nodeName, nodeValue } = node
        const hasPlaceholderName = nodeName.match(placeholderRegex)
        const hasPlaceholderValue = nodeValue.match(placeholderRegex)
        if (hasPlaceholderName || hasPlaceholderValue) {
          const sourceName = strings.join().search(new RegExp(nodeName, 'i'))[0]

        }
      }
    } else {

    }
  }
}
