import { replace } from '../utils.js'
import { placeholder, toPlaceholderString } from '../../utils.js'

const makeElement = ({
  template,
  template: {
    placeholdersMetadata
  },
  placeholderMetadata,
  placeholderMetadata: {
    type,
    ids,
    values: [ _tagName ],
    tagName = _tagName ? toPlaceholderString(_tagName) : undefined,
    values: [ _attributeName, _doubleQuoteValue, _singleQuoteValue, _noQuoteValue ]
  },
  arrayFragment
}) => {
  let dependents
  for (const id of ids) arrayFragment[0].removeAttribute(placeholder(id))
  const _this = ({ values, forceUpdate }) => {
    if (!dependents) {
      dependents = placeholdersMetadata
        .filter(placeholderMetadata =>
          placeholderMetadata.ids.some(id =>
            ids.includes(id)))
        .map(placeholderMetadata =>
          template.placeholders.find(({metadata}) =>
            metadata === placeholderMetadata))
        .filter(placeholder => placeholder !== _this)
    }
    if (type === 'startTag') {
      const newElement = document.createElement(tagName(values))
      for (const placeholder of dependents) placeholder({ values, forceUpdate: true })
      replace(arrayFragment, newElement)
    }
  }
  return _this
}

export default makeElement
