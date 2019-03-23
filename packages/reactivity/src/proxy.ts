import { setReactivity, getReactivity, setReactive } from './utils'
import { Reactivity, ReactiveObject, NativeReactiveObject } from '../types'

export default (object: Object): ReactiveObject | NativeReactiveObject => {
  let reactivity: Reactivity<Object>
  const proxy = new Proxy(object, {
    get (target, property, receiver) {
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
          const watcher = _ => notify({ target: proxy, property })
          Object.defineProperties(watcher, Object.getOwnPropertyDescriptors({ object, property, propertyReactivity, cache: true }))
          value = registerWatcher(_ => (propertyReactivity.cache = Reflect.get(target, property, receiver)), watcher)
        }
      }
      return value
    },
    deleteProperty (target, property) {
      try {
        return Reflect.deleteProperty(target, property)
      } finally {
        notify({ target: proxy, property })
        const { properties } = target[reactivity]
        if (!properties.get(property).watchers.length) properties.delete(property)
      }
    },
    defineProperty (target, property, desc, { value: _value, ...rest } = desc/* desc */) {
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
  setReactive(object, proxy)
  setReactivity(proxy)
  reactivity = getReactivity(proxy)
  return proxy
}
