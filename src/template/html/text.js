const text = ({
  value,
  values,
  getChildNodes,
  setChildNodes,
  nodes = [],
  data: { instance: oldInstance, unlisten: oldUnlisten, textArray: oldTextArray = [] } = {},
  placeholder: { index } = {}
}) => {
  if (oldUnlisten) oldUnlisten()
  if (values && !value) value = values[index]
  if (typeof value === 'string' || typeof value === 'number') {
    if (nodes[0] instanceof Text) {
      if (nodes[0].nodeValue !== value) nodes[0].nodeValue = value
      return { nodes: [nodes[0]] }
    } else {
      return { nodes: [new Text(value)] }
    }
  } else if (value instanceof Node) {
    if (nodes[0] !== value) return { nodes: [value] }
    else return { nodes: [value] }
  } else if (value && value.build && !value.$promise) {
    if (oldInstance && oldInstance.instance && oldInstance.id === value.id) {
      oldInstance.update(...value.values)
      return { nodes: oldInstance._childNodes, data: { instance: oldInstance } }
    } else {
      const instance = value()
      const unlisten = instance.listen((newChildNodes, oldChildNodes) => {
        setChildNodes(newChildNodes)
        // const currentChildNodes = getChildNodes()
        // setChildNodes(Object.assign([...currentChildNodes], {[currentChildNodes.indexOf(oldChildNodes)]: newChildNodes}))
      })
      return { nodes: instance._childNodes, data: { instance, unlisten } }
    }
  } else if (value && value.instance && !value.$promise) {
    const unlisten = value.listen((newChildNodes, oldChildNodes) => {
      setChildNodes(newChildNodes)
    })
    return { nodes: value._childNodes, data: { instance: value, unlisten } }
  } else if (Array.isArray(value)) {
    if (value.length === 0) value = [undefined]
    // todo: add more of the parameters to cover all of the simple text features
    const textArray = value.map((value, i) => {
      const oldText = oldTextArray[i]
      const _text = text({
        value,
        nodes: oldText && oldText.nodes,
        data: oldText && oldText.data
      })
      return _text
    })
    return { nodes: textArray.map(({nodes}) => nodes), data: { textArray } }
  } else if (value && value.$promise) {
    return { nodes: [ new Text('') ] }
  } else {
    return { nodes: [ nodes[0] instanceof Comment ? nodes[0] : new Comment('') ] }
  }
}

export default text
