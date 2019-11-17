import {
  placeholderMinRangeChar,
  placeholderMaxRangeChar,
  placeholderRegex,
  placeholdersRegex,
  toPlaceholder,
  fromPlaceholder,
  toPlaceholderString,
  placeholderTypeToPlaceholderMetadataType
} from './utils.ts'
import { PlaceholderMetadata, PlaceholderType, CommentMetadata, TextMetadata, ElementMetadata, AttributeMetadata, PlaceholderMetadataType, AttributeType } from './types.ts' // eslint-disable-line no-unused-vars

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_-][-\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

const textRegex = new RegExp(`([${placeholderMinRangeChar}-${placeholderMaxRangeChar}])|([^${placeholderMinRangeChar}-${placeholderMaxRangeChar}]*)`, 'umg')

const getNodePath = (node, path = [], { parentNode: parent } = node) =>
  parent
    ? getNodePath(
      parent,
      path.concat(
        Array
          .from(parent.childNodes)
          .indexOf(node)
      )
    )
    : path.reverse()

const getNodeFilter = placeholders =>
  (
    placeholders.some(({ type }) =>
      type === PlaceholderType.START_TAG
      || type === PlaceholderType.END_TAG
    )
      ? NodeFilter.SHOW_ELEMENT
      : 0
  )
  +
  (
    placeholders.some(({ type }) => type === PlaceholderType.COMMENT)
      ? NodeFilter.SHOW_COMMENT
      : 0
  )
  +
  (
    placeholders.some(({ type }) => type === PlaceholderType.TEXT)
      ? NodeFilter.SHOW_TEXT
      : 0
  )

const acceptNode = ({ nodeType, outerHTML, innerHTML, data }: Element & CharacterData) =>
  nodeType === Node.ELEMENT_NODE
    ? outerHTML.replace(innerHTML, '').match(placeholdersRegex)
      ? NodeFilter.FILTER_ACCEPT
      : innerHTML.match(placeholdersRegex)
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_REJECT
    : (
      nodeType === Node.TEXT_NODE
      || nodeType === Node.COMMENT_NODE
      )
      && data.match(placeholdersRegex)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT

const setCharacterDataNodePath = (node: CharacterData, placeholders: PlaceholderMetadata[]) => {
  const match = node.data.match(placeholderRegex)
  if (match) {
    const isTextNode = node.nodeType === Node.TEXT_NODE
    const placeholderNode = isTextNode ? (<Text>node).splitText(match.index) : node
    if (isTextNode) {
      placeholderNode.data = placeholderNode.data.substring(match[0].length)
      if (placeholderNode.data.length) {
        (<Text>placeholderNode).splitText(0)
      }
    }
    placeholders[fromPlaceholder(match[0])].path = getNodePath(placeholderNode)
  }
}

const setElementNodePath =
  (node: Element, placeholders: PlaceholderMetadata[]) =>
    node.outerHTML
      .replace(node.innerHTML, '')
      .match(placeholdersRegex)
      .map(fromPlaceholder)
      .forEach(id => {
        placeholders[id].path = getNodePath(node)
      })

const walkPlaceholders = (html: string, placeholders: PlaceholderMetadata[]) => {
  const template = document.createElement('template')
  template.innerHTML = html

  const walker = document.createTreeWalker(template.content, getNodeFilter(placeholders), { acceptNode })

  while (walker.nextNode()) {
    const { currentNode, currentNode: { nodeType } } = walker
    if (nodeType === Node.ELEMENT_NODE) {
      setElementNodePath(<Element>currentNode, placeholders)
    } else if (nodeType === Node.TEXT_NODE || nodeType === Node.COMMENT_NODE) {
      setCharacterDataNodePath(<Text|Comment>currentNode, placeholders)
    }
  }

  return template.content
}

export default (
  { transform, strings, values }: { transform: Function, strings: string[], values: any[] }
): [ DocumentFragment, PlaceholderMetadata[] ] => {
  let source = transform(strings.reduce((str, str2, i) => str + toPlaceholder(i - 1) + str2))
  let html = ''
  const placeholders: PlaceholderMetadata[] = []
  const advance = <T extends PlaceholderMetadata>(n, placeholderType: PlaceholderType = undefined, ...vals): T => {
    let replacement = ''
    const type = placeholderTypeToPlaceholderMetadataType(placeholderType)
    const placeholder =
      placeholderType && {
        placeholderType,
        type,
        ids:
          vals
            .filter(Boolean)
            .map(val => (val.match(placeholdersRegex) || [])
              .map(char => fromPlaceholder(char)))
            .flat(Infinity),
        path: []
      }

    if (type === PlaceholderMetadataType.COMMENT) {
      (<CommentMetadata>placeholder).data = vals[0]
    } else if (type === PlaceholderMetadataType.TEXT) {
      (<TextMetadata>placeholder).data = vals[0]
    } else if (type === PlaceholderMetadataType.ELEMENT) {
      (<ElementMetadata>placeholder).tagName = vals[0]
    } else if (type === PlaceholderMetadataType.ATTRIBUTE) {
      (<AttributeMetadata>placeholder).attributeType = vals[1] ? AttributeType.BARE : AttributeType.QUOTED;
      (<AttributeMetadata>placeholder).name = vals[0];
      (<AttributeMetadata>placeholder).value = vals[1] || vals[2] || vals[3]
    }
    if (placeholderType) {
      const { ids } = placeholder
      if (ids.length) {
        ids.forEach(_ => placeholders.push(placeholder))
        if (placeholderType === PlaceholderType.START_TAG || placeholderType === PlaceholderType.END_TAG) {
          replacement =
            toPlaceholderString(vals[0])(values) +
            (placeholderType === PlaceholderType.START_TAG
              ? ` ${toPlaceholder(ids[0])}`
              : '')
        } else if (placeholderType === PlaceholderType.ATTRIBUTE || placeholderType === PlaceholderType.COMMENT) {
          replacement =
          `${
            placeholderType === PlaceholderType.ATTRIBUTE
              ? ' '
              : ''
          }${
            toPlaceholder(ids[0])
          }`
        }
      }
    }
    html += replacement || source.substr(0, n)
    source = source.substring(n)
    return <T>placeholder
  }
  while (source) { // eslint-disable-line no-unmodified-loop-condition
    const textEnd = source.indexOf('<')
    if (textEnd === 0) {
      if (source.startsWith('<!--')) { // Comment
        const commentEnd = source.indexOf('-->')
        if (commentEnd === -1) {
          advance(4)
          advance<CommentMetadata>(source.length - 1, PlaceholderType.COMMENT, source)
          continue
        }
        advance(4)
        advance<CommentMetadata>(commentEnd - 4, PlaceholderType.COMMENT, source.substr(0, commentEnd - 4))
        advance(3)
        continue
      }
      const endTagMatch = source.match(endTag)
      if (endTagMatch) { // End tag
        advance<ElementMetadata>(endTagMatch[0].length, PlaceholderType.END_TAG, source.substr(0, endTagMatch[0].length))
        continue
      }
      const startTagMatch = source.match(startTagOpen)
      if (startTagMatch) { // Start tag
        advance(1)
        const placeholder = advance<ElementMetadata>(startTagMatch[1].length, PlaceholderType.START_TAG, startTagMatch[1])
        let attributes = []
        let end, attr
        while (!(end = source.match(startTagClose)) && (attr = source.match(attribute))) {
          const attrPlaceholder = advance<AttributeMetadata>(attr[0].length, PlaceholderType.ATTRIBUTE, attr[1], attr[3], attr[4], attr[5])
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
    const textMatches = source.substring(0, textEnd !== -1 ? textEnd : textEnd.length).match(textRegex)
    for (const str of textMatches) advance<TextMetadata>(str.length, PlaceholderType.TEXT, str)
  }
  return [
    walkPlaceholders(html, placeholders),
    placeholders
  ]
}
