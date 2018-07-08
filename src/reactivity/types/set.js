import { r } from '../index.js'
import { notify, registerDependency, setReactivity, reactivity, cloning } from '../utils.js'
import proxify from '../proxy.js'

export const type = Set

export const getProperty = (reactiveSet, prop) => reactiveSet.has(prop)

export const ReactiveType = class ReactiveSet extends Set {
  constructor (iterator) {
    super()
    const proxy = proxify(this)
    setReactivity({target: proxy, original: cloning ? this : iterator, object: this})
    if (iterator) for (const val of iterator) proxy.add(val)
    return proxy
  }
  add (val) {
    const value = r(val)
    try {
      return super.add.apply(this[reactivity].object, [value])
    } finally {
      registerDependency({ target: this })
      notify({ target: this, property: val, value })
    }
  }
  has (val) {
    try {
      return super.has.apply(this[reactivity].object, [val])
    } finally {
      registerDependency({ target: this, property: val })
    }
  }
}

export default set => new ReactiveType(set)
