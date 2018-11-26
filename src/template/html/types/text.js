import { replace } from '../../utils.js'
import { OzHTMLTemplate } from '../elements/utils.js'

const makeText = ({
  template,
  placeholderMetadata,
  arrayFragment,

  _value,
  _template,
  _placeholders,
  _fragments
}) =>
  ({
    values,
    value = values[placeholderMetadata.ids[0]],
    forceUpdate
  }) => {
    const type = typeof value
    if (value && type === 'object') {
      if (value instanceof Promise) {
        replace(arrayFragment, new Text())
          value.then(resolvedValue =>
            _value === value
              ? template.update(...template.values.map((_, i) =>
                i === placeholderMetadata.ids[0]
                  ? resolvedValue
                  : _))
              : undefined)
      } else if (value && value[OzHTMLTemplate]) {
        if (value.templateId === _template?.templateId) {
          _template.update(...value.values)
          replace(arrayFragment, _template.childNodes)
        }
        else replace(arrayFragment, value.childNodes)
        _template = value
      } else if (Array.isArray(value)) {
        const values = value
        const [ placeholders, fragments ] =
          values.reduce(tuple =>
            (tuple[0].push(makeText({
              template,
              placeholderMetadata,
              arrayFragment: tuple[1][tuple[1].push([]) - 1] })), tuple)
            , [[], []])
        placeholders.forEach((placeholder, i) => placeholder({value: value[i]}))
        replace(arrayFragment, fragments)
        _placeholders = placeholders
        _fragments = fragments
      } else if (value instanceof Node) {
        replace(arrayFragment, value)
      }
    } else if (type === 'function') {
      if (value.prototype instanceof Node) {
        const Constructor = value
        if (arrayFragment[0] instanceof Constructor) replace(arrayFragment, arrayFragment[0])
        else replace(arrayFragment, new Constructor())
      } else {
        makeText({
          template,
          placeholderMetadata,
          arrayFragment
        })({ value: value(arrayFragment) })
      }
    } else {
      const textNode = arrayFragment[0]
      const newValue =
        value === undefined ||
        value === false
          ? ''
          : type === 'symbol'
            ? value.toString()
            : '' + value
      if (textNode?.nodeType === Node.TEXT_NODE) {
        replace(arrayFragment, textNode)
        if (textNode.data !== newValue) textNode.data = newValue
      } else {
        replace(arrayFragment, new Text(newValue))
      }
    }
    if (!arrayFragment.flat(Infinity).length) replace(arrayFragment, new Comment())
    _value = value
  }

export default makeText
