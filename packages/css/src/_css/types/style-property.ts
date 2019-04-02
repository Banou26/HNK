import { toPlaceholderString } from '../../utils'

export default ({
  placeholderMetadata: {
    values,
    path
  },
  rules: [ style ],
  getNameResult = toPlaceholderString(values[0]),
  getValueResult = toPlaceholderString(values[1]),
  _name = `--${path[path.length - 1]}`
}) =>
  ({ values }) => {
    style.removeProperty(_name)
    style.setProperty(_name = getNameResult(values), getValueResult(values))
  }
