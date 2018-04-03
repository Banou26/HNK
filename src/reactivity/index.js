import { cloneObject, isBuiltIn as IsBuiltIn, getPropertyDescriptor } from '../utils.js'

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

export const reactify = (_object = {}, { reactiveRoot = defaultReactiveRoot, clone = true } = {}) => {
  if (_object.__reactivity__ instanceof Reactivity || IsIgnoredObjectType(_object) || _object.__reactivity__ === false) return _object
  const object = clone ? cloneObject(_object, {
    replaceObjects: object => reactify(object, { reactiveRoot, clone: false }),
    doNotCopyObjects: object => object.__reactivity__
  }) : _object
  if (clone) return object
  const isBuiltIn = IsBuiltIn(object)
  const reactivity = new Reactivity()
  if (!object.__reactivity__) Object.defineProperty(object, '__reactivity__', { value: reactivity })
  for (let i in object) {
    const desc = getPropertyDescriptor(object, i)
    const { value } = desc
    if (value && typeof value === 'object') {
      if (value.__reactivity__ instanceof Reactivity) Object.defineProperty(object, i, {...desc, value: _object[i]})
      else Object.defineProperty(object, i, {...desc, value: reactify(value, { reactiveRoot, clone })})
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
      // if (value && typeof value === 'object' && value.__reactivity__ instanceof Reactivity) {
      //   // reactivity.watchers.push({object, watcher, reactiveRoot})
      //   // value.$watch(currentWatcher.watcher)
      //   const watcherObject = getCurrentWatcher(reactiveRoot)
      //   console.log('watcherObject', watcherObject)
      //   if (watcherObject) value.__reactivity__.watchers.push(watcherObject)
      // }
      if (isBuiltIn && typeof value === 'function') {
        value = new Proxy(value, {
          apply (_target, thisArg, argumentsList) {
            try {
              return Reflect.apply(_target, target, argumentsList)
            } finally {
              // if (isBuiltIn[1].setters && isBuiltIn[1].setters.includes(prop)) callObjectsWatchers(propReactivity, reactivity)
              if (isBuiltIn[1].setters && isBuiltIn[1].setters.includes(prop)) callObjectsWatchers(propReactivity, reactivity)
            }
          }
        })
        reactivity.cache.set(prop, value)
      }
      if (reactiveRoot.watchers.length) {
        const currentWatcher = getCurrentWatcher(reactiveRoot)
        if (!includeWatcherObj(propWatchers, currentWatcher)) propWatchers.push(currentWatcher)
        if (value && typeof value === 'object' && value.__reactivity__ instanceof Reactivity && !value.__reactivity__.watchers.includes(getCurrentWatcher(reactiveRoot))) value.__reactivity__.watchers.push(getCurrentWatcher(reactiveRoot))
      }
      return value
    },
    set (target, prop, value, receiver) {
      if (value === target[prop]) return true
      if (reactiveProperties.includes(prop)) return Reflect.set(target, prop, value, receiver)
      initDefaultPropertyReactivity(reactivity.properties, prop)
      if (value && typeof value === 'object') value = reactify(value, { reactiveRoot, clone })
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

export const watch = (getter, handler, {reactiveRoot = defaultReactiveRoot} = {}) => {
  let unwatch, oldValue
  const watcher = _ => {
    if (unwatch) return
    let newValue = registerWatcher(getter, watcher, {reactiveRoot})
    if (newValue && typeof newValue === 'object' && newValue.__reactivity__ instanceof Reactivity && !newValue.__reactivity__.watchers.find(obj => obj.watcher === watcher)) newValue.__reactivity__.watchers.push({watcher})
    if (handler) handler(newValue, oldValue)
    oldValue = newValue
  }
  oldValue = registerWatcher(getter, watcher, {reactiveRoot})
  if (oldValue && typeof oldValue === 'object' && oldValue.__reactivity__ instanceof Reactivity && !oldValue.__reactivity__.watchers.find(obj => obj.watcher === watcher)) oldValue.__reactivity__.watchers.push({watcher})
  return _ => (unwatch = true)
}
window.reactify = reactify
window.cloneObject = cloneObject
