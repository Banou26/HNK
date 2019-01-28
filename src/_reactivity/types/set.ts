import { r } from '../index'
import { notify, registerDependency, setReactivity, reactivity, propertyReactivity } from '../utils'

export const type = Set

export const getProperty = (reactiveSet, prop) => reactiveSet.has(prop)
export const ReactiveType = class ReactiveSet extends Set {
  constructor (iterator) {
    super()
    setReactivity({target: this, original: iterator, object: this})
    if (iterator) for (const val of iterator) this.add(val)
  }

  get size () {
    registerDependency({ target: this })
    return super.size
  }

  add (val) {
    const value = r(val)
    try {
      return super.add(value)
    } finally {
      notify({ target: this, property: value, value })
    }
  }

  delete (val) {
    const value = r(val)
    try {
      return super.delete(value)
    } finally {
      notify({ target: this, property: value, value })
      const { properties } = this[reactivity]
      if (!properties.get(value)?.watchers.length) properties.delete(value)
    }
  }

  clear () {
    try {
      return super.clear()
    } finally {
      notify({ target: this })
      const { properties } = this[reactivity]
      for (const value of this) {
        if (!properties.get(value)?.watchers.length) properties.delete(value)
      }
      for (const [ key ] of properties) {
        if (!properties.get(key)?.watchers.length) properties.delete(key)
      }
    }
  }

  has (val) {
    const value = r(val)
    propertyReactivity(this, value)
    registerDependency({ target: this, property: value, value })
    return super.has(value)
  }
}

for (const property of ['entries', 'forEach', 'keys', 'values', Symbol.iterator]) {
  ReactiveType.prototype[property] = function (...args) {
    registerDependency({ target: this })
    return type.prototype[property].apply(this, args)
  }
}

export default set => new ReactiveType(set)
