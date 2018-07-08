import { r } from '../index.js'
import { reactivity, notify, registerWatcher, registerDependency, reactivityProperties, propertyReactivity as _propertyReactivity } from './utils.js'
import { getPropertyDescriptor } from '../utils.js'

export default object => {
  const proxy = new Proxy(object, {
    get (target, property, receiver) {
      if (reactivityProperties.includes(property)) return Reflect.get(target, property, receiver)
      const propertyReactivity = _propertyReactivity(target, property)
      const descriptor = getPropertyDescriptor(target, property)
      let value
      if (descriptor && 'value' in descriptor) { // property
        value = Reflect.get(target, property, receiver)
      } else { // getter
        if ('cache' in propertyReactivity) {
          value = propertyReactivity.cache
        } else {
          const watcher = _ => {
            notify({ target, property })
          }
          watcher.propertyReactivity = propertyReactivity
          watcher.cache = true
          value = registerWatcher(_ => (propertyReactivity.cache = Reflect.get(target, property, receiver)), watcher, {object, property})
        }
      }
      registerDependency({ target, property })
      if (value && (typeof value === 'object' || typeof value === 'function') && value[reactivity]) registerDependency({ target: value })
      return value
    },
    set (target, property, _value, receiver) {
      registerDependency({ target: receiver, property })
      if (_value === target[property]) return true
      if (reactivityProperties.includes(property)) {
        registerDependency({ target: _value, property })
        return Reflect.set(target, property, _value, receiver)
      }
      let value = r(_value)
      registerDependency({ target: value, property })
      if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue
      else if (typeof value === 'function' && value.$promise) {
        value.$promise.then(val =>
          target[property] === value
            ? (receiver[property] = val)
            : undefined)
      }
      if (value && typeof value === 'object' && reactivity in value) {
        let unwatch = value.$watch(_ => target[property] === value ? notify({ target, property, value, deep: true }) : unwatch(), { deep: true })
      }
      try {
        return Reflect.set(target, property, value, receiver)
      } finally {
        notify({ target, property, value })
      }
    },
    deleteProperty (target, property) {
      registerDependency({ target: target, property })
      if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property)
      try {
        return Reflect.deleteProperty(target, property)
      } finally {
        notify({ target, property })
        const { properties } = target[reactivity]
        if (!properties.get(property).watchers.length) properties.delete(property)
      }
    },
    defineProperty (target, property, {value: _value, ...rest}/* desc */) {
      if (reactivityProperties.includes(property)) {
        registerDependency({ target: _value, property })
        return Reflect.defineProperty(target, property, {
          ..._value !== undefined && { value: _value },
          ...rest
        }) || true
      }
      let value = r(_value)
      registerDependency({ target: value, property })
      if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue
      else if (typeof value === 'function' && value.$promise) {
        value.$promise.then(val =>
          target[property] === value
            ? (proxy[property] = val)
            : undefined)
      }
      if (value && typeof value === 'object' && reactivity in value) {
        let unwatch = value.$watch(_ => target[property] === value ? notify({ target, property, value, deep: true }) : unwatch(), { deep: true })
      }
      try {
        return Reflect.defineProperty(target, property, {
          ...value !== undefined && { value: value },
          ...rest
        }) || true
      } finally {
        notify({ target, property, value })
      }
    }
  })
  return proxy
}
