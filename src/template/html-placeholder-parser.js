import { html } from './utils.js'
const {
  placeholder,
  split,
  getSplitValueIndexes,
  mergeSplitWithValues,
  mergeSplitWithPlaceholders
} = html

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

const parseAttributes = ({leftHTML = '', rightHTML, attributes = []}) => {
  const tagCloseMatch = rightHTML.match(startTagClose)
  if (tagCloseMatch) return { attributes: attributes, leftHTML: leftHTML, rightHTML }
  const match = rightHTML.match(attribute)
  if (!match) throw new SyntaxError(`Oz html template attribute parsing: tag isn't closed.`)
  const attrNameSplit = split(match[1])
  const attributeValue = match[3] || match[4] || match[5]
  const attrValueSplit = attributeValue ? split(attributeValue) : ['']
  const indexes = [...getSplitValueIndexes(attrNameSplit), ...getSplitValueIndexes(attrValueSplit)]
  return parseAttributes({
    leftHTML: `${leftHTML} ${indexes.length ? placeholder(indexes[0]) : match[0]}`,
    rightHTML: rightHTML.substring(match[0].length),
    attributes: indexes.length ? [...attributes, {
      type: match[3] ? 0 : match[4] ? 1 : 2,
      nameSplit: attrNameSplit,
      valueSplit: attrValueSplit,
      indexes
    }] : attributes
  })
}

export const parsePlaceholders = ({ htmlArray, values, placeholders = [], leftHTML = '', rightHTML }) => {
  if (rightHTML === undefined) return parsePlaceholders({ values, rightHTML: mergeSplitWithPlaceholders(htmlArray) })
  if (!rightHTML.length) return { placeholders, html: leftHTML }
  const _textEnd = rightHTML.indexOf('<')
  const isComment = rightHTML.startsWith('<!--')
  if (_textEnd || isComment) {
    const textEnd = _textEnd === -1 ? rightHTML.length : _textEnd
    const commentEnd = isComment ? rightHTML.indexOf('-->') : undefined
    if (isComment && commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${rightHTML.substring(0, textEnd)}"`)
    const textContent = rightHTML.substring(isComment ? 4 : 0, isComment ? commentEnd : textEnd)
    const textSplit = split(textContent)
    const hasPlaceholder = textSplit.length > 1
    const indexes = getSplitValueIndexes(textSplit)
    return parsePlaceholders({
      values,
      placeholders: hasPlaceholder ? [...placeholders, {
        type: isComment ? 'comment' : 'text',
        indexes: getSplitValueIndexes(textSplit),
        split: textSplit
      }] : placeholders,
      leftHTML: leftHTML + (isComment ? `<!--${hasPlaceholder ? placeholder(indexes[0]) : textContent}-->` : textContent),
      rightHTML: rightHTML.substring(isComment ? commentEnd + 3 : textEnd)
    })
  }
  const startTagMatch = rightHTML.match(startTagOpen)
  if (startTagMatch) {
    const tagSplit = split(startTagMatch[1])
    const hasPlaceholder = tagSplit.length > 1
    const indexes = getSplitValueIndexes(tagSplit)
    const {
      attributes,
      leftHTML: _leftHTML,
      rightHTML: _rightHTML
    } = parseAttributes({rightHTML: rightHTML.substring(startTagMatch[0].length)})
    const attributePlaceholders = attributes.map(({type, ...rest}) => ({
      type: 'attribute',
      attributeType: type,
      ...rest
    }))
    return parsePlaceholders({
      values,
      placeholders: [...placeholders, ...hasPlaceholder ? [{
        type: 'tag',
        indexes,
        split: tagSplit,
        attributes: attributes.map(({indexes}) => indexes)
      }] : [],
        ...attributePlaceholders.length ? attributePlaceholders : []],
      leftHTML: `${leftHTML}<${mergeSplitWithValues(tagSplit, values)}${hasPlaceholder ? ` ${placeholder(indexes[0])} ` : ''}${_leftHTML}`,
      rightHTML: _rightHTML
    })
  }
  const endTagMatch = rightHTML.match(endTag)
  if (endTagMatch) {
    const tagSplit = split(endTagMatch[1])
    return parsePlaceholders({
      values,
      placeholders,
      leftHTML: `${leftHTML}</${mergeSplitWithValues(tagSplit, values)}>`,
      rightHTML: rightHTML.substring(endTagMatch[0].length)
    })
  }
}
