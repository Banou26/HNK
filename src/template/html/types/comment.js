import { toPlaceholderString } from '../../utils.js'

export default ({ placeholderMetadata, arrayFragment, getResult = toPlaceholderString(placeholderMetadata.values[0]) }) =>
  ({ values, forceUpdate }) => (arrayFragment[0].data = getResult(values))
