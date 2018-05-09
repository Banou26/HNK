import { mergeSplitWithValues } from './utils.js'

export default ({ values, node, placeholder: { split } }) => {
  node.nodeValue = mergeSplitWithValues(split, values)
  return { node }
}
