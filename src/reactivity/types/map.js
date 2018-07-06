import { r } from '../index.js'
import { notify, registerDependency, setReactivity, reactivity } from '../utils.js'
import proxify from '../proxy.js'

export const type = Map

export const getProperty = (reactiveMap, prop) => reactiveMap.get(prop)

export const ReactiveType = class ReactiveMap extends Map {
  constructor (iterator) {
    super()
    const proxy = proxify(this)
    setReactivity({target: proxy, original: iterator, object: this})
    if (iterator) for (const [key, val] of iterator) proxy.set(key, val)
    return proxy
  }
  set (key, val) {
    const value = r(val)
    try {
      return super.set.apply(this[reactivity].object, [key, value])
    } finally {
      registerDependency({ target: this, property: key })
      notify({ target: this, property: key, value })
    }
  }
  delete (key, val) {
    const value = r(val)
    try {
      return super.delete.apply(this[reactivity].object, [key, value])
    } finally {
      registerDependency({ target: this, property: key })
      notify({ target: this, property: key, value })
    }
  }
  get (key) {
    try {
      return super.get.apply(this[reactivity].object, [key])
    } finally {
      registerDependency({ target: this, property: key })
    }
  }
  has (key) {
    try {
      return super.has.apply(this[reactivity].object, [key])
    } finally {
      registerDependency({ target: this, property: key })
    }
  }
}

export default map => new ReactiveType(map)
