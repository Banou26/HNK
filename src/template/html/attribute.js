import { mergeSplitWithValues } from './utils.js'

export default ({ refs, values, placeholder, node, data: { name: oldName, listener: oldListener, value: oldValue } = {}, placeholder: { type, indexes, attributeType, nameSplit, valueSplit } }) => {
  if (oldListener) node.removeEventListener(oldName, oldValue)
  const name = mergeSplitWithValues(nameSplit, values)
  const value = attributeType === '' ? values[valueSplit[1]] : mergeSplitWithValues(valueSplit, values) // mergeSplitWithValues(valueSplit, values)
  if (attributeType === '"') { // double-quote
    node.setAttribute(name, value)
  } else if (attributeType === '\'') {  // single-quote
    node.setAttribute(name, value)
  } else if (attributeType === '') {  // no-quote
    let isEvent = name.startsWith('on-') ? 1 : name.startsWith('@') ? 2 : 0
    if (isEvent) { // Event handling
      const listenerName = name.substring(isEvent === 1 ? 3 : 1)
      node.addEventListener(listenerName, value)
      return { node, data: { name: listenerName, listener: true, value } }
    } else if (nameSplit.length === 3 && nameSplit[1] && values[nameSplit[1]].htmlReference) {
      refs.set(values[nameSplit[1]].name, node)
    } else if (value && typeof value === 'object' && value.htmlReference) {
      node[name] = refs.get(value.name)
    } else {
      node[name] = value
    }
  }
  return {node, data: { name }}
}
