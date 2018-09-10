import { toPlaceholderString } from '../../utils.js'

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
  ({ values, forceUpdate }) => {
    style.removeProperty(_name)
    _name = getNameResult(values)
    style.setProperty(_name, getValueResult(values))
  }
