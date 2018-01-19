import { cloneObject, isBuiltIn as IsBuiltIn, getPropertyDescriptor } from '../util/index.js'

export let Reactivity = class Reactivity {
  constructor () {
    this.watchers = []
    this.properties = new Map()
    this.cache = new Map()
  }
}

const reactiveProperties = ['__reactivity__', '$watch']

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
    if ((object && prop && object === _object && prop === _prop) || watcher === _watcher) return item
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
  for (const watcherObj of watchers) {
    if (watcherObj.watcher.cache) cacheWatchers.push(watcherObj)
    else nonCacheWatchers.push(watcherObj)
  }
  for (const watcherObj of [...cacheWatchers, ...nonCacheWatchers]) watcherObj.watcher()
}

const callObjectsWatchers = (...objects) => {
  let watchers = []
  for (const obj of objects) watchers = [...watchers, ...obj.watchers]
  for (const obj of objects) obj.watchers = []
  callWatchers(watchers)
}

const initDefaultPropertyReactivity = (props, prop) => {
  if (!props.has(prop)) props.set(prop, { watchers: [] })
}

const ignoreObjectType = [
  Error,
  Node
]

export const IsIgnoredObjectType = obj => {
  for (const type of ignoreObjectType) {
    if (obj instanceof type) return obj
  }
}

export const reactify = (_object = {}, reactiveRoot = defaultReactiveRoot) => {
  if (_object.__reactivity__ instanceof Reactivity || IsIgnoredObjectType(_object) || _object.__reactivity__ === false) return _object
  const object = cloneObject(_object)
  const isBuiltIn = IsBuiltIn(object)
  const protoProps = isBuiltIn ? Object.getOwnPropertyNames(isBuiltIn[0].prototype) : []
  const reactivity = new Reactivity()
  Object.defineProperty(object, '__reactivity__', { value: reactivity })
  for (let i in object) {
    const desc = getPropertyDescriptor(object, i)
    const { value } = desc
    if (value && typeof value === 'object') {
      if (value.__reactivity__ instanceof Reactivity) object[i] = _object[i]
      else object[i] = reactify(value, reactiveRoot)
    }
  }
  const proxy = new Proxy(object, {
    get (target, prop, receiver) {
      if (reactiveProperties.includes(prop)) return Reflect.get(target, prop, isBuiltIn ? target : receiver)
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const propReactivity = reactivity.properties.get(prop)
      const propWatchers = propReactivity.watchers
      const desc = getPropertyDescriptor(target, prop)
      let value
      if (desc && Reflect.has(desc, 'value')) { // property
        value = Reflect.get(target, prop, isBuiltIn ? target : receiver)
      } else { // getter
        if (reactivity.cache.has(prop)) {
          value = reactivity.cache.get(prop)
        } else {
          const watcher = _ => {
            reactivity.cache.delete(prop)
            callObjectsWatchers(propReactivity, reactivity)
          }
          watcher.cache = true
          value = registerWatcher(_ => {
            let _value = Reflect.get(target, prop, isBuiltIn ? target : receiver)
            reactivity.cache.set(prop, _value)
            return _value
          }, watcher, {object, prop, reactiveRoot})
        }
      }
      if (isBuiltIn && typeof value === 'function') {
        value = value.bind(target)
        if (protoProps.includes(prop)) {
          const _value = value
          value = (...args) => {
            _value(...args)
            callObjectsWatchers(propReactivity, reactivity)
            return receiver
          }
        }
      }
      if (reactiveRoot.watchers.length) {
        const currentWatcher = getCurrentWatcher(reactiveRoot)
        if (!includeWatcherObj(propWatchers, currentWatcher)) propWatchers.push(currentWatcher)
      }
      return value
    },
    set (target, prop, value, receiver) {
      if (value === target[prop]) return true
      if (reactiveProperties.includes(prop)) return Reflect.set(target, prop, value, receiver)
      initDefaultPropertyReactivity(reactivity.properties, prop)
      if (value && typeof value === 'object') value = reactify(value, reactiveRoot)
      const result = Reflect.set(target, prop, value, receiver)
      callObjectsWatchers(reactivity.properties.get(prop), reactivity)
      return result
    },
    deleteProperty (target, prop) {
      if (reactiveProperties.includes(prop)) return Reflect.delete(target, prop)
      initDefaultPropertyReactivity(reactivity.properties, prop)
      const result = Reflect.deleteProperty(target, prop)
      callObjectsWatchers(reactivity.properties.get(prop), reactivity)
      if (!reactivity.properties.get(prop).watchers.length /* && reactivity.watchers.length */) {
        reactivity.properties.delete(prop)
        reactivity.cache.delete(prop)
      }
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
          reactivity.watchers.push({object, watcher, reactiveRoot})
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
    if (handler) handler(newValue, oldValue)
    oldValue = newValue
  }
  oldValue = registerWatcher(getter, watcher, {reactiveRoot})
  return _ => (unwatch = true)
}
