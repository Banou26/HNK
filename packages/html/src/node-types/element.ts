import { placeholder, toPlaceholderString, toPlaceholdersNumber, replace } from '../utils.ts'

// todo: Implement it

const getDependentsPlaceholders = ({ template, placeholdersMetadata, ids, self }) =>
  placeholdersMetadata
    .filter(placeholderMetadata =>
      placeholderMetadata.ids.some(id =>
        ids.includes(id)))
    .map(placeholderMetadata =>
      template.placeholders.find(({metadata}) =>
        metadata === placeholderMetadata))
    .filter(placeholder => placeholder !== self)

const eventRegexes = [/^@/, /^on-/]

const removeEventListeners = (element, event, listeners) =>
  listeners.forEach(listener =>
    element.removeEventListener(event, listener))

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
    values: [ __attributeName, _doubleQuoteValue, _singleQuoteValue, unquotedValue ],

    toAttributeName = __attributeName ? toPlaceholderString(__attributeName) : undefined,
    toDoubleQuoteValue = _doubleQuoteValue ? toPlaceholderString(_doubleQuoteValue) : undefined,
    toSingleQuoteValue = _singleQuoteValue ? toPlaceholderString(_singleQuoteValue) : undefined
  },
  arrayFragment,

  dependents,
  _attributeName = toAttributeName(template.values),
  _value,
  _eventName,
  _eventListeners,
  _ref
}) => {
  for (const id of ids) arrayFragment[0].removeAttribute(placeholder(id))
  const self = ({ values, forceUpdate, element = arrayFragment[0], references = template.references, value = values[ids[0]] }) => {
    if (_ref && !(!_doubleQuoteValue && !_singleQuoteValue && !unquotedValue && value?.[OzHTMLReference])) {
      if(references.has(_ref[OzHTMLReference])) references.delete(_ref[OzHTMLReference])
      _ref = undefined
    }
    if (!dependents) dependents = getDependentsPlaceholders({ template, placeholdersMetadata, ids, self })
    if (type === 'startTag') {
      const newElement = document.createElement(tagName(values))
      for (const placeholder of dependents) placeholder({ values, forceUpdate: true })
      replace(arrayFragment, newElement)
    } else if (type === 'attribute') {
      if (!_doubleQuoteValue && !_singleQuoteValue && !unquotedValue && value?.[OzHTMLReference]) {
        if(references.get(value[OzHTMLReference]) !== element) references.set(value[OzHTMLReference], element)
        _ref = value
      } else {
        const attributeName = toAttributeName(values)
        if (unquotedValue) {
          const placeholdersNumber = toPlaceholdersNumber(unquotedValue)
          const eventTest = eventRegexes.find(regex => attributeName.match(regex))
          if (eventTest) {
            if (!_eventListeners) _eventListeners = []
            const listeners =
              placeholdersNumber
                .map(n => values[n])
                .filter(v => typeof v === 'function')
            const newListeners =
              listeners
                .filter(listener => !_eventListeners.includes(listener))
            const eventName = attributeName.replace(eventTest, '')
            removeEventListeners(element, _eventName, _eventListeners.filter(listener => !listeners.includes(listener)))
            for (const listener of newListeners) element.addEventListener(eventName, listener)
            _eventName = eventName
            _eventListeners = listeners
          } else {
            if (_eventListeners) removeEventListeners(element, _attributeName, _eventListeners)
            _eventListeners = undefined
            element[attributeName] = values[placeholdersNumber[0]]
          }
        } else {
          if (attributeName !== _attributeName && element.hasAttribute(_attributeName)) element.removeAttribute(_attributeName)
          const value = (toDoubleQuoteValue || toSingleQuoteValue || (_ => undefined))(values)
          if (attributeName) element.setAttribute(attributeName, value.trim() || '')
          _value = value
        }
        _attributeName = attributeName
      }
    }
  }
  return self
}

export default makeElement
