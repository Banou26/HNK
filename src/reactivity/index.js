import { cloneObject } from '../util/index.js'
// Object where reactive objects register themselves when a watcher search for dependencies
export let defaultReactiveRoot = {
  watcher: null
}
// In case there can be multiple windows sharing one reactiveRoot (e.g. Electron/WebExtensions)
export const setDefaultReactiveRoot = reactiveRoot => (defaultReactiveRoot = reactiveRoot)

const registerWatcher = (getter, watcher, reactiveRoot = defaultReactiveRoot) => {
  reactiveRoot.watcher = watcher
  const value = getter()
  reactiveRoot.watcher = null
  return value
}

const defaultPropertyReactivity = _ => ({
  watchers: []
})

const isEnumerable = (target, prop) => {
  const propDescriptor = Object.getOwnPropertyDescriptor(target, prop)
  return propDescriptor && propDescriptor.enumerable
}

export const reactify = (_object = {}, reactiveRoot = defaultReactiveRoot) => {
  const object = cloneObject(_object)
  const reactivity = {
    watchers: [],
    properties: {},
    cache: new Map()
  }
  Object.defineProperty(object, '__reactivity__', { value: reactivity })
  for (let i in object) {
    const value = Object.getOwnPropertyDescriptor(object, i).value
    if (value && typeof value === 'object') object[i] = reactify(value, reactiveRoot)
  }
  const proxy = new Proxy(object, {
    get (target, prop, receiver) {
      if (!isEnumerable(target, prop)) return Reflect.get(target, prop, receiver)
      if (!reactivity.properties[prop]) reactivity.properties[prop] = defaultPropertyReactivity()
      const descriptor = Object.getOwnPropertyDescriptor(target, prop)
      let result

      if (descriptor.value) {
        result = Reflect.get(target, prop, receiver)
      } else if (descriptor.get) { // Getter value caching
        if (reactiveRoot.watcher) {
          const watcher = _ => reactivity.cache.delete(prop)
          watcher.cache = true
          reactivity.watchers.push(watcher)
        }
        if (reactivity.cache.has(prop)) {
          result = reactivity.cache.get(prop)
        } else {
          result = Reflect.get(target, prop, receiver) // descriptor.get() can be used for custom getters behavior
          reactivity.cache.set(prop, result)
        }
      } else {
        result = reactify(Reflect.get(target, prop, receiver), reactiveRoot)
      }
      const propWatchers = reactivity.properties[prop].watchers
      if (reactiveRoot.watcher) {
        if (!propWatchers.includes(reactiveRoot.watcher)) propWatchers.push(reactiveRoot.watcher)
        if (!reactivity.watchers.includes(reactiveRoot.watcher)) reactivity.watchers.push(reactiveRoot.watcher)
        if (result && typeof result === 'object' && !result.__reactivity__.watchers.includes(reactiveRoot.watcher)) result.__reactivity__.watchers.push(reactiveRoot.watcher)
      }
      return result
    },
    set (target, prop, _value, receiver) {
      if (/* prop in target && */ !isEnumerable(target, prop)) return Reflect.set(target, prop, _value, receiver)
      if (!reactivity.properties[prop]) reactivity.properties[prop] = defaultPropertyReactivity()
      let value = _value
      if (_value && typeof _value === 'object') value = reactify(_value)
      const result = Reflect.set(target, prop, value, receiver)

      // call watchers dependents of this property
      const propReactivity = reactivity.properties[prop]
      const propWatchers = [...propReactivity.watchers]
      const objWatchers = [...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []

      // call the cache watchers first (to get a consistant behavior)
      const propCacheWatchers = []
      const nonPropCacheWatchers = []
      const objCacheWatchers = []
      const nonObjCacheWatchers = []
      for (const watcher of propWatchers) {
        if (watcher.cache) propCacheWatchers.push(watcher)
        else nonPropCacheWatchers.push(watcher)
      }
      for (const watcher of objWatchers) {
        if (watcher.cache) objCacheWatchers.push(watcher)
        else nonObjCacheWatchers.push(watcher)
      }
      for (const watcher of propCacheWatchers) watcher()
      for (const watcher of objCacheWatchers) watcher()
      for (const watcher of propWatchers) watcher()
      for (const watcher of objWatchers) watcher()
      return result
    },
    deleteProperty (target, prop) {
      if (!isEnumerable(target, prop)) return Reflect.deleteProperty(target, prop)
      const propReactivity = reactivity.properties[prop]
      const result = Reflect.deleteProperty(target, prop)

      // call watchers dependents of this property
      const propWatchers = [...propReactivity.watchers]
      const objWatchers = [...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []

      // call the cache watchers first (to get a consistant behavior)
      const propCacheWatchers = []
      const nonPropCacheWatchers = []
      const objCacheWatchers = []
      const nonObjCacheWatchers = []
      for (const watcher of propWatchers) {
        if (watcher.cache) propCacheWatchers.push(watcher)
        else nonPropCacheWatchers.push(watcher)
      }
      for (const watcher of objWatchers) {
        if (watcher.cache) objCacheWatchers.push(watcher)
        else nonObjCacheWatchers.push(watcher)
      }
      for (const watcher of propCacheWatchers) watcher()
      for (const watcher of objCacheWatchers) watcher()
      for (const watcher of propWatchers) watcher()
      for (const watcher of objWatchers) watcher()
      return result
    }
  })
  Object.defineProperty(object, '$watch', {
    value: (getter, handler) => {
      if (!handler) {
        handler = getter
        getter = null
      }
      let unwatch, oldValue
      const watcher = _ => {
        if (unwatch) return
        if (getter) {
          let newValue = registerWatcher(getter.bind(proxy), watcher, reactiveRoot)
          handler(newValue, oldValue)
          oldValue = newValue
        } else {
          handler(proxy, proxy)
          reactivity.watchers.push(watcher)
        }
      }
      if (getter) oldValue = registerWatcher(getter.bind(proxy), watcher, reactiveRoot)
      else reactivity.watchers.push(watcher)
      return _ => (unwatch = true)
    }
  })
  return proxy
}

export const watch = (getter, handler, reactiveRoot = defaultReactiveRoot) => {
  let unwatch, oldValue
  const watcher = _ => {
    if (unwatch) return
    let newValue = registerWatcher(getter, watcher, reactiveRoot)
    handler(newValue, oldValue)
    oldValue = newValue
  }
  oldValue = registerWatcher(getter, watcher, reactiveRoot)
  return _ => (unwatch = true)
}
