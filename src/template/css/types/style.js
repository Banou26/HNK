import { toPlaceholderString } from '../../utils.js'

export default ({
  placeholderMetadata,
  rules: [ rule ],
  getResult = toPlaceholderString(placeholderMetadata.values[0])
}) =>
  ({ values, forceUpdate }) =>
    (rule.selectorText = getResult(values))
