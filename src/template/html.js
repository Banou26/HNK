import { htmlTemplate } from './html-template.js'

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

export const html = htmlTemplate((sourceArr, values, { placeholderStr, placeholderRegex, placeholderRegexGlobal, split, getSplitIds, execSplit, joinSrcWithPlaceholders }) => {
  let source = joinSrcWithPlaceholders(sourceArr)
  let html = ''
  let placeholders = []
  const advance = (n, type, ...vals) => {
    let replacement = ''
    let placeholder
    if (type) {
      placeholder = { type, ids: [], /* values: vals, */ splits: [], path: [] }
      let { splits } = placeholder
      for (const val of vals) {
        if (!val) continue
        const valSplit = split(val)
        splits.push(valSplit)
        placeholder.ids = [...placeholder.ids, ...getSplitIds(valSplit)]
      }
      let { ids } = placeholder
      if (ids.length) {
        placeholders.push(placeholder)
        if (type === 'attribute' || type === 'property') {
          replacement = ' ' + placeholderStr(ids[0])
        } else if (type === 'startTagName') {
          replacement = execSplit(splits[0], values) + ' ' + placeholderStr(ids[0])
        } else if (type === 'endTagName') {
          replacement = execSplit(splits[0], values)
        } else if (type === 'comment') {
          replacement = placeholderStr(ids[0])
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
        if (commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${source.substring(0, textEnd)}"`)
        advance(4)
        advance(commentEnd - 4, 'comment', source.substr(0, commentEnd - 4))
        advance(3)
        continue
      }

      const endTagMatch = source.match(endTag)
      if (endTagMatch) { // End tag
        advance(endTagMatch[0].length, 'endTagName', source.substr(0, endTagMatch[0].length))
        continue
      }

      const startTagMatch = source.match(startTagOpen)
      if (startTagMatch) { // Start tag
        advance(1)
        const placeholder = advance(startTagMatch[1].length, 'startTagName', startTagMatch[1])
        let attributes = []
        let end, attr
        while (!(end = source.match(startTagClose)) && (attr = source.match(attribute))) {
          if (attr[5]) {
            attributes.push(advance(attr[0].length, 'property', attr[1], attr[3], attr[4], attr[5]))
          } else {
            attributes.push(advance(attr[0].length, 'attribute', attr[1], attr[3], attr[4], attr[5]))
          }
        }
        attributes = attributes.filter(item => item)
        if (attributes.length) placeholder.dependents = attributes
        if (!end) throw new Error(`Start tag not closed, can't continue the template parsing "${source.substring(0, textEnd)}"`)
        advance(end[0].length)
        continue
      }
    }
    const textContent = source.substring(0, textEnd !== -1 ? textEnd : textEnd.length)
    const textSplit = split(textContent)
    for (const i in textSplit) {
      const str = i % 2 ? placeholderStr(textSplit[i]) : textSplit[i]
      advance(str.length, 'text', str)
    }
  }
  return { placeholders, html }
})
