import { r, notify, registerDependency, registerWatcher, propertyReactivity as _propertyReactivity, reactivityProperties, reactivitySymbol } from './index.js'
import { getPropertyDescriptor } from '../utils.js'

export default object => new Proxy(object, {
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
          notify({ target })
        }
        watcher.propertyReactivity = propertyReactivity
        watcher.cache = true
        value = registerWatcher(_ => (propertyReactivity.cache = Reflect.get(target, property, receiver)), watcher, {object, property})
      }
    }
    registerDependency({ target, property })
    if ((typeof value === 'object' || typeof value === 'function') && value[reactivitySymbol]) registerDependency({ target: value })
    return value
  },
  set (target, property, _value, receiver) {
    if (_value === target[property]) return true
    if (reactivityProperties.includes(property)) return Reflect.set(target, property, _value, receiver)
    let value = r(_value)
    if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue
    else if (typeof value === 'function' && value.$promise) {
      value.$promise.then(val =>
        target[property] === value
        ? (receiver[property] = val)
        : undefined)
    }
    try {
      return Reflect.set(target, property, value, receiver)
    } finally {
      notify({ target, property, value })
      notify({ target, value })
    }
  },
  deleteProperty (target, property) {
    if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property)
    try {
      return Reflect.deleteProperty(target, property)
    } finally {
      notify({ target, property })
      notify({ target })
      const reactivityProperties = target[reactivitySymbol].properties
      if (!reactivityProperties.get(property).watchers.length) reactivityProperties.delete(property)
    }
  }
  // defineProperty (target, property, {value, ...rest}) {
  //   console.log('defineProperty', property)
  //   if (reactivityProperties.includes(property)) return Reflect.defineProperty(target, property, {...value !== undefined && { value }, ...rest})
  //   try {
  //     return Reflect.defineProperty(target, property, {
  //       ...value !== undefined && { value: r(value) },
  //       ...rest
  //     })
  //   } finally {
  //     notify({ target, property })
  //     notify({ target })
  //   }
  // }
})
