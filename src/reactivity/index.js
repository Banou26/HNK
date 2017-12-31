import { cloneObject, isBuiltIn as IsBuiltIn, getPropertyDescriptor } from '../util/index.js'

export let Reactivity = class Reactivity {
  constructor () {
    this.watchers = []
    this.properties = new Map()
    this.cache = new Map()
  }
}

// Object where reactive objects register themselves when a watcher search for dependencies
export let defaultReactiveRoot = {
  watchers: [],
  Reactivity
}

// In case there can be multiple windows sharing one reactiveRoot (e.g. Electron/WebExtensions)
export const setDefaultReactiveRoot = reactiveRoot => {
  defaultReactiveRoot = reactiveRoot
  Reactivity = reactiveRoot.Reactivity
}

const includeWatcherObj = (arr, {object, prop, watcher}) => {
  for (const item of arr) {
    const {object: _object, prop: _prop, watcher: _watcher} = item
    if ((object === _object && prop === _prop) || watcher === _watcher) return item
  }
}

const getCurrentWatcher = ({watchers}) => watchers[watchers.length - 1]

const registerWatcher = (getter, watcher, options) => {
  const {object, prop, reactiveRoot = defaultReactiveRoot} = options
  const watcherObj = {object, prop, watcher}
  const length = reactiveRoot.watchers.push(watcherObj)
  const value = getter()
  reactiveRoot.watchers.splice(length - 1, 1)
  return value
}

const callWatchers = watchers => {
  const cacheWatchers = []
  const nonCacheWatchers = []
  for (const watcher of watchers) {
    if (watcher.cache) cacheWatchers.push(watcher)
    else nonCacheWatchers.push(watcher)
  }
  for (const watcherObj of [...cacheWatchers, ...nonCacheWatchers]) watcherObj.watcher()
}

const initDefaultPropertyReactivity = (props, prop) => {
  if (!props.has(prop)) props.set(prop, { watchers: [] })
}

export const reactify = (_object = {}, reactiveRoot = defaultReactiveRoot) => {
  if (_object.__reactivity__ instanceof Reactivity) return _object
  const object = cloneObject(_object)
  const isBuiltIn = IsBuiltIn(object)
  const protoProps = isBuiltIn ? Object.getOwnPropertyNames(isBuiltIn[0].prototype) : []
  const reactivity = new Reactivity()
  Object.defineProperty(object, '__reactivity__', { value: reactivity })
  for (let i in object) {
    const desc = Object.getOwnPropertyDescriptor(object, i)
    if (desc && desc.value && typeof desc.value === 'object') object[i] = reactify(desc.value, reactiveRoot)
  }
  const proxy = new Proxy(object, {
    get (target, prop, receiver) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const propReactivity = reactivity.properties.get(prop)
      const desc = getPropertyDescriptor(target, prop)
      if (!desc) return Reflect.get(target, prop, isBuiltIn ? target : receiver)
      let value
      if (Reflect.has(desc, 'value') && !isBuiltIn) { // property
        value = Reflect.get(target, prop, isBuiltIn ? target : receiver)
      } else { // getter
        if (reactivity.cache.has(prop)) value = reactivity.cache.get(prop)
        else {
          value = Reflect.get(target, prop, isBuiltIn ? target : receiver)
          if (isBuiltIn && typeof value === 'function') {
            value = value.bind(target)
            if (protoProps.includes(prop)) {
              const _value = value
              value = (...args) => {
                _value(...args)
                return receiver
              }
            }
          } else {
            const watcher = _ => reactivity.cache.delete(prop)
            watcher.cache = true
            value = registerWatcher(_ => {
              let _value = Reflect.get(target, prop, isBuiltIn ? target : receiver)
              reactivity.cache.set(prop, _value)
              return _value
            }, watcher, {object, prop, reactiveRoot})
          }
        }
      }
      const propWatchers = propReactivity.watchers
      if (reactiveRoot.watchers.length) {
        const currentWatcher = getCurrentWatcher(reactiveRoot)
        if (!includeWatcherObj(propWatchers, currentWatcher)) propWatchers.push(currentWatcher)
        if (!includeWatcherObj(reactivity.watchers, currentWatcher)) reactivity.watchers.push(currentWatcher)
        if (value && typeof value === 'object' && value.__reactivity__ && !includeWatcherObj(value.__reactivity__.watchers, currentWatcher)) value.__reactivity__.watchers.push(currentWatcher)
      }
      return value
    },
    set (target, prop, value, receiver) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      if (value && typeof value === 'object' && !(value.__reactivity__ instanceof Reactivity)) value = reactify(value, reactiveRoot)
      const result = Reflect.set(target, prop, value, receiver)
      const propReactivity = reactivity.properties.get(prop)
      const watchers = [...propReactivity.watchers, ...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []
      callWatchers(watchers)
      return result
    },
    deleteProperty (target, prop) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const result = Reflect.deleteProperty(target, prop)
      const propReactivity = reactivity.properties.get(prop)
      const watchers = [...propReactivity.watchers, ...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []
      callWatchers(watchers)
      reactivity.properties.delete(prop)
      reactivity.cache.delete(prop)
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
          let newValue = registerWatcher(getter.bind(proxy), watcher, {reactiveRoot})
          handler(newValue, oldValue)
          oldValue = newValue
        } else {
          handler(proxy, proxy)
          reactivity.watchers.push(watcher)
        }
      }
      if (getter) oldValue = registerWatcher(getter.bind(proxy), watcher, {reactiveRoot})
      else reactivity.watchers.push({object, watcher, reactiveRoot})
      return _ => (unwatch = true)
    }
  })
  return proxy
}

export const watch = (getter, handler, reactiveRoot = defaultReactiveRoot) => {
  let unwatch, oldValue
  const watcher = _ => {
    if (unwatch) return
    let newValue = registerWatcher(getter, watcher, {reactiveRoot})
    handler(newValue, oldValue)
    oldValue = newValue
  }
  oldValue = registerWatcher(getter, watcher, {reactiveRoot})
  return _ => (unwatch = true)
}
