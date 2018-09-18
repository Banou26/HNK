import { replace } from '../../utils.js'
import { OzStyle } from '../elements/utils.js'

export const makeStylesheet = ({
  placeholderMetadata: {
    rule: ast,
    ids
  },
  rules,
  getIndexOf = rule => Array.from(rules[0].parentStyleSheet.cssRules).indexOf(rule),
  getFirstIndex = _ => getIndexOf(rules[0]),
  getLastIndex = _ => getIndexOf(rules[rules.length - 1]),
  _value
}) =>
  ({
    values,
    value = values[ids[0]],
    forceUpdate
  }) => {
    if (value && typeof value === 'object' && OzStyle in value) {
      if (_value && typeof _value === 'object' && OzStyle in _value && _value.templateId === value.templateId) {
        _value.update(...value.values)
        replace(rules, ..._value.childRules)
      } else replace(rules, ...value.connectedCallback([ast], rules))
    }
    _value = value
  }

export default makeStylesheet
