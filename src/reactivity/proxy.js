import { r } from '../index.js'
import { reactivity, notify, registerWatcher, registerDependency, reactivityProperties, propertyReactivity as _propertyReactivity } from './utils.js'
import { getPropertyDescriptor } from '../utils.js'

export default object => {
  const proxy = new Proxy(object, {
    get (target, property, receiver) {
      if (reactivityProperties.includes(property)) return Reflect.get(target, property, receiver)
      registerDependency({ target, property })
      const propertyReactivity = _propertyReactivity(target, property)
      const descriptor = getPropertyDescriptor(target, property)
      let value
      if (descriptor && 'value' in descriptor) { // property
        value = Reflect.get(target, property, receiver)
      } else { // getter
        if ('cache' in propertyReactivity) {
          value = propertyReactivity.cache
        } else {
          value = registerWatcher(
            _ => (propertyReactivity.cache = Reflect.get(target, property, receiver)),
            _ => notify({ target: proxy, property }),
            { object, property, propertyReactivity, cache: true })
        }
      }
      return value
    },
    deleteProperty (target, property) {
      if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property)
      try {
        return Reflect.deleteProperty(target, property)
      } finally {
        notify({ target: proxy, property })
        const { properties } = target[reactivity]
        if (!properties.get(property).watchers.length) properties.delete(property)
      }
    },
    defineProperty (target, property, desc, { value: _value, ...rest } = desc/* desc */) {
      if (reactivityProperties.includes(property)) return Reflect.defineProperty(target, property, desc)
      if (!_value) {
        try {
          // return Reflect.defineProperty(target, property, desc) // TODO: find why the hell this doesn't work
          return Reflect.defineProperty(target, property, {
            ..._value !== undefined && { value: _value },
            ...rest
          })
        } finally {
          notify({ target: proxy, property, value: _value })
        }
      }
      let value = r(_value)
      try {
        return Reflect.defineProperty(target, property, {
          ...value !== undefined && { value: value },
          ...rest
        })
      } finally {
        if (value && typeof value === 'object' && value[reactivity]) {
          let { unregister } = value.$watch(_ =>
            target[property] === value
              ? notify({ target: proxy, property, value, deep: true })
              : unregister()
            , { deep: true })
        }
        notify({ target: proxy, property, value })
      }
    }
  })
  return proxy
}
