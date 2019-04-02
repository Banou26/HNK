import { toPlaceholderString } from '../../utils'

export default ({ placeholderMetadata, arrayFragment, getResult = toPlaceholderString(placeholderMetadata.values[0]) }) =>
  ({ values, forceUpdate }) => (arrayFragment[0].data = getResult(values))
