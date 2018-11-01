import { r } from '../index.js'
import { notify, registerDependency, setReactivity, reactivity, propertyReactivity } from '../utils.js'

export const type = Map

export const getProperty = (reactiveMap, prop) => reactiveMap.get(prop)
export const ReactiveType = class ReactiveMap extends Map {
  constructor (iterator) {
    super()
    setReactivity({target: this, original: iterator, object: this})
    if (iterator) for (const [key, val] of iterator) this.set(key, val)
  }

  get size () {
    registerDependency({ target: this })
    return super.size
  }

  set (key, val) {
    const value = r(val)
    try {
      return super.set(key, value)
    } finally {
      notify({ target: this, property: key, value })
    }
  }

  delete (key) {
    try {
      return super.delete(key)
    } finally {
      notify({ target: this, property: key })
      const { properties } = this[reactivity]
      if (!properties.get(key)?.watchers.length) properties.delete(key)
    }
  }

  clear () {
    try {
      return super.clear()
    } finally {
      notify({ target: this })
      const { properties } = this[reactivity]
      for (const [ key ] of this) {
        if (!properties.get(key)?.watchers.length) properties.delete(key)
      }
      for (const [ key ] of properties) {
        if (!properties.get(key)?.watchers.length) properties.delete(key)
      }
    }
  }

  get (key) {
    propertyReactivity(this, key)
    registerDependency({ target: this, property: key })
    return super.get(key)
  }

  has (key) {
    registerDependency({ target: this, property: key })
    return super.has(key)
  }
}

for (const property of ['entries', 'forEach', 'keys', 'values', Symbol.iterator]) {
  ReactiveType.prototype[property] = function (...args) {
    registerDependency({ target: this })
    return type.prototype[property].apply(this, args)
  }
}

export default map => new ReactiveType(map)
