import { r, notify, registerDependency, setObjectReactivity, reactivitySymbol } from '../index.js'
import proxify from '../proxy.js'

export const type = Set

export const reactivePrototype = new Map([
  ['add', {
    notify: true
  }],
  ['delete', {
    notify: true
  }],
  ['clear', {
    notify: true
  }]
])

export const ReactiveType = class ReactiveSet extends Set {
  constructor (iterator) {
    super()
    const proxy = proxify(this)
    setObjectReactivity({target: proxy, original: iterator, object: this})
    if (iterator) for (const val of iterator) proxy.add(val)
    return proxy
  }
  add (val) {
    const value = r(val)
    try {
      return super.add.apply(this[reactivitySymbol].object, [value])
    } finally {
      registerDependency({ target: this })
      notify({ target: this, value })
    }
  }
}

export default set => new ReactiveType(set)
