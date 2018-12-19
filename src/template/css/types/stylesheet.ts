import { replace } from '../../utils'
import { OzStyle } from '../elements/utils'

export const makeStylesheet = ({
  placeholderMetadata: {
    rule: ast,
    ids
  },
  rules,
  getIndexOf = rule => Array.from(rules[0].parentStyleSheet.cssRules).indexOf(rule),
  getFirstIndex = _ => getIndexOf(rules[0]),
  getLastIndex = _ => getIndexOf(rules[rules.length - 1]),
  _style
}) =>
  ({
    values,
    value = values[ids[0]],
    forceUpdate,
    scope
  }) => {
    if (value && typeof value === 'object' && OzStyle in value) {
      value.scope = scope
      if (
        _style &&
        typeof _style === 'object' &&
        OzStyle in _style &&
        _style.templateId === value.templateId &&
        _style.values.some((val, i) => val !== value[i])
      ) {
        _style.update(...value.values)
        replace(rules, ..._style.childRules)
      } else {
        _style = value
        replace(rules, ...value.connectedCallback([ast], rules))
      }
    }
  }

export default makeStylesheet
