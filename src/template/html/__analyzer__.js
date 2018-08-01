import { placeholderRegex, placeholder, charToN } from '../utils.js'

const voidElements = [...new Set(
  [ 'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed', 'frame', 'hr', 'image', 'img', 'input', 'isindex', 'keygen', 'link', 'menuitem', 'meta', 'nextid', 'param', 'source', 'track', 'wbr' ]
    .map(tag => document.createElement(tag).constructor)
    .filter(Class => Class !== HTMLElement && Class !== HTMLUnknownElement)
)]

const isVoidElement = el => voidElements.some(Class => el instanceof Class)

const nodeFilter = NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT

const analyzeTags = ({transform, strings, values}) => {
  const preHTML = transform(strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2), '')
  const tagPlaceholders = []
  const attributePlaceholders = []
  const textPlaceholders = []
  const commentPlaceholders = []
  walkPlaceholders({
    html: preHTML,
    element: ({tagName, attributes}) =>
      (tagPlaceholders.push(...[...tagName.match(placeholderRegex)].map(charToN)) || true) &&
      attributePlaceholders.push(
        ...[...attributes]
          .map(({name, value}) => [...name.match(placeholderRegex), ...value.match(placeholderRegex)])
          .map(charToN)
          .flat(1)),
    text: ({data}) => textPlaceholders.push(...[...data.match(placeholderRegex)].map(charToN)),
    comment: ({data}) => commentPlaceholders.push(...[...data.match(placeholderRegex)].map(charToN))
  })
  const allPlaceholderIndexes = Array(values.length).fill(0).map((_, i) => i)
  const foundIndexes = [...tagPlaceholders, ...attributePlaceholders, ...textPlaceholders, ...commentPlaceholders]
  const closingTagPlaceholders = allPlaceholderIndexes.filter(i => !foundIndexes.includes(i))
  // console.log(preHTML, tagPlaceholders, attributePlaceholders, textPlaceholders, commentPlaceholders, closingTagPlaceholders)
  // const filteredPlaceholders = tagPlaceholders.filter(({node}) => !isVoidElement(node)).reverse()
  // console.group('tests')
  // strings.reduce((str, str2, i) => console.log(filteredPlaceholders.find(({index}) => index === i), filteredPlaceholders.some(({index}) => index === i) ? filteredPlaceholders.pop().index : i))
  // console.groupEnd()
  return {
    html: transform(strings.reduce((str, str2, i) =>
      str +
      placeholder(filteredPlaceholders.some(({index}) => index === i) ? filteredPlaceholders.pop().index : i - 1) +
      str2, '')),
    indexes: [...foundIndexes, ...closingTagPlaceholders]
  }
}

const walkPlaceholders = ({html, element, text, comment}) => {
  const template = document.createElement('template')
  template.innerHTML = html
  const walker = document.createTreeWalker(template.content, nodeFilter, {
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
  return template
}

export default ({transform, strings, values}) => {
  const { html, indexes } = analyzeTags({transform, strings, values})
  console.log(html, indexes)
  const placeholders = []
  const template = document.createElement('template')
  template.innerHTML = html
  const walker = document.createTreeWalker(template, nodeFilter, {
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
  return {
    html: '',
    placeholders: []
  }
}
