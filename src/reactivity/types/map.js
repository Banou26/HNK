import { r, notify, registerDependency, setObjectReactivity, reactivitySymbol } from '../index.js'
import proxify from '../proxy.js'

export const type = Map

export const reactivePrototype = new Map([
  ['set', {
    notify: true
  }],
  ['delete', {
    notify: true
  }],
  ['clear', {
    notify: true
  }]
])

// Todo: Make a system to improve notify calls by specifying a property

export const ReactiveType = class ReactiveMap extends Map {
  constructor (iterator) {
    super()
    const proxy = proxify(this)
    setObjectReactivity({target: proxy, original: iterator, object: this})
    if (iterator) for (const [key, val] of iterator) proxy.set(key, val)
    return proxy
  }
  set (key, val) {
    const value = r(val)
    try {
      return super.set.apply(this[reactivitySymbol].object, [key, value])
    } finally {
      registerDependency({ target: this })
      notify({ target: this, value })
    }
  }
}

export default map => new ReactiveType(map)
