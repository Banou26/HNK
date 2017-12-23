import { cloneObject } from '../util/index.js'

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

const isObjectPropWatcherRegistered = ({obj, prop}, reactiveRoot = defaultReactiveRoot) => {
  const { watchers } = reactiveRoot
  for (const watcherObj of watchers) {
    if (watcherObj.obj === obj && watcherObj.prop === prop) return true
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

const internalSetters = ['set', 'add', 'clear', 'delete']

const initDefaultPropertyReactivity = (props, prop) => {
  if (!props.has(prop)) props.set(prop, { watchers: [] })
}

export const reactify = (_object = {}, reactiveRoot = defaultReactiveRoot) => {
  const object = cloneObject(_object)
  const reactivity = new Reactivity()
  Object.defineProperty(object, '__reactivity__', { value: reactivity })
  for (let i in object) {
    const value = Object.getOwnPropertyDescriptor(object, i).value
    if (value && typeof value === 'object') object[i] = reactify(value, reactiveRoot)
  }
  const proxy = new Proxy(object, {
    get (target, prop, receiver) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const desc = Object.getOwnPropertyDescriptor(target, prop)
      let value
      if (desc) {
        if (desc.value) {
          value = Reflect.get(target, prop, receiver)
        } else if (desc.get) { // Getter value caching
          if (reactivity.cache.has(prop)) value = reactivity.cache.get(prop)
          else {
            const watcher = _ => reactivity.cache.delete(prop)
            watcher.cache = true
            value = registerWatcher(Reflect.get.bind(target, target, prop, receiver), watcher, {object, prop, reactiveRoot})
            if (value && typeof value === 'object') value = reactify(value, reactiveRoot)
            reactivity.cache.set(prop, value)
          }
        }
      } else {
        value = Reflect.get(target, prop, target)
        const internalSettersObject = target instanceof Map || target instanceof Set
        if (internalSettersObject && typeof value === 'function') {
          value = value.bind(target)
          if (internalSetters.includes(prop)) {
            const _value = value
            value = (...args) => {
              _value(...args)
              callWatchers(reactivity.watchers)
              reactivity.watchers = []
              return receiver
            }
          }
        } else if (typeof value === 'object') value = reactify(value, reactiveRoot)
      }
      const propWatchers = reactivity.properties.get(prop).watchers
      if (reactiveRoot.watchers.length) {
        const currentWatcher = getCurrentWatcher(reactiveRoot)
        if (!propWatchers.includes(reactiveRoot.watcher)) propWatchers.push(currentWatcher)
        if (!reactivity.watchers.includes(reactiveRoot.watchers)) reactivity.watchers.push(currentWatcher)
        if (value && typeof value === 'object' && !value.__reactivity__.watchers.includes(currentWatcher)) value.__reactivity__.watchers.push(currentWatcher)
      }
      return value
    },
    set (target, prop, value, receiver) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      if (value && typeof value === 'object') value = reactify(value, reactiveRoot)
      const result = Reflect.set(target, prop, value, receiver)
      const propReactivity = reactivity.properties.get(prop)
      callWatchers([...propReactivity.watchers, ...reactivity.watchers])
      propReactivity.watchers = []
      reactivity.watchers = []
      return result
    },
    deleteProperty (target, prop) {
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const result = Reflect.deleteProperty(target, prop)
      const propReactivity = reactivity.properties.get(prop)
      callWatchers([...propReactivity.watchers, ...reactivity.watchers])
      propReactivity.watchers = []
      reactivity.watchers = []
      reactivity.properties.delete(prop)
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
