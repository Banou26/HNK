import { mergeSplitWithValues } from './utils.js'

export default ({ values, node, placeholder: { split } }) => {
  const newTag = mergeSplitWithValues(split, values)
  return {
    node: node.tagName.toLowerCase() === newTag.toLowerCase()
      ? node
      : document.createElement(newTag)
  }
}
