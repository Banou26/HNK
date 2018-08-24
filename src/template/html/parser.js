import { walkPlaceholders, getNodePath } from './utils.js'
import { placeholderMinRangeChar, placeholderMaxRangeChar, placeholderRegex, placeholder as toPlaceholder, charToN, toPlaceholderString } from '../utils.js'

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_-][-\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

const textRegex = new RegExp(`([${placeholderMinRangeChar}-${placeholderMaxRangeChar}])|([^${placeholderMinRangeChar}-${placeholderMaxRangeChar}]*)`, 'umg')

const getCharacterDataNodePath = placeholders =>
  node => {
    const match = node.data.match(new RegExp(placeholderRegex, 'um'))
    if (match) {
      const isTextNode = node.nodeType === Node.TEXT_NODE
      const placeholderNode = isTextNode ? node.splitText(match.index) : node
      if (isTextNode) {
        placeholderNode.data = placeholderNode.data.substring(match[0].length)
        if (placeholderNode.data.length) placeholderNode.splitText(0)
      }
      placeholders[charToN(match[0])].path = getNodePath(placeholderNode)
    }
  }

export default ({transform, strings, values}) => {
  let source = transform(strings.reduce((str, str2, i) => str + toPlaceholder(i - 1) + str2))
  let html = ''
  const placeholders = []
  const advance = (n, type, ...vals) => {
    // vals = vals.filter(_ => _)
    let replacement = ''
    let placeholder
    if (type) {
      placeholder = {
        type,
        ids: vals.map(val => (val.match(placeholderRegex) || []).map(char => charToN(char))).flat(Infinity),
        values: vals,
        path: []
      }
      let { ids } = placeholder
      if (ids.length) {
        ids.forEach(_ => placeholders.push(placeholder))
        if (type === 'startTag' || type === 'endTag') {
          replacement = toPlaceholderString(vals[0])(values) + (type === 'startTag' ? ` ${toPlaceholder(ids[0])}` : '')
        } else if (type === 'attribute' || type === 'comment') {
          replacement = `${type === 'attribute' ? ' ' : ''}${toPlaceholder(ids[0])}`
        }
      }
    }
    html += replacement || source.substr(0, n)
    source = source.substring(n)
    return placeholder
  }
  while (source) { // eslint-disable-line no-unmodified-loop-condition
    const textEnd = source.indexOf('<')
    if (textEnd === 0) {
      if (source.startsWith('<!--')) { // Comment
        const commentEnd = source.indexOf('-->')
        if (commentEnd === -1) {
          advance(4)
          advance(source.length - 1, 'comment', source)
          continue
        }
        advance(4)
        advance(commentEnd - 4, 'comment', source.substr(0, commentEnd - 4))
        advance(3)
        continue
      }
      const endTagMatch = source.match(endTag)
      if (endTagMatch) { // End tag
        advance(endTagMatch[0].length, 'endTag', source.substr(0, endTagMatch[0].length))
        continue
      }
      const startTagMatch = source.match(startTagOpen)
      if (startTagMatch) { // Start tag
        advance(1)
        const placeholder = advance(startTagMatch[1].length, 'startTag', startTagMatch[1])
        let attributes = []
        let end, attr
        while (!(end = source.match(startTagClose)) && (attr = source.match(attribute))) {
          const attrPlaceholder = advance(attr[0].length, 'attribute', attr[1], attr[3], attr[4], attr[5])
          attrPlaceholder.dependents = attributes
          attributes.push(attrPlaceholder)
        }
        attributes = attributes.filter(item => item)
        placeholder.dependents = attributes
        if (end) {
          advance(end[0].length)
          continue
        }
      }
    }
    for (const str of source.substring(0, textEnd !== -1 ? textEnd : textEnd.length).match(textRegex)) advance(str.length, 'text', str)
  }
  return {
    fragment: walkPlaceholders({
      html,
      text: getCharacterDataNodePath(placeholders),
      comment: getCharacterDataNodePath(placeholders)
    }),
    placeholdersMetadata: placeholders
  }
}
