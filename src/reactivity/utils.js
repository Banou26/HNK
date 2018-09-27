import { isBuiltIn, getProperty } from './types/index.js'

export const reactivity = Symbol.for('OzReactivity')

export const reactivityProperties = ['$watch', reactivity]

export let rootWatchers = []
export let rootObjects = new WeakMap()

export const getReactivityRoot = _ => ({rootWatchers, rootObjects})
export const setReactivityRoot = ({watchers: w, objects: o}) => (rootWatchers = w) && (rootObjects = o)

const callWatcher = (watcher, deep, obj) =>
  deep
    ? watcher.deep
      ? watcher(obj)
      : undefined
    : watcher(obj)

export const notify = ({ target, property, value, deep }) => {
  const react = target[reactivity] // eslint-disable-line no-use-before-define
  if (!react) return
  const callWatchers = watchers => {
    const currentWatcher = rootWatchers[rootWatchers.length - 1]
    if (watchers.includes(currentWatcher)) watchers.splice(watchers.indexOf(currentWatcher), 1)
    const cacheWatchers = watchers.filter(({cache}) => cache)/* .filter(({_target, _property}) => (target === _target && property === _property)) */
    cacheWatchers.forEach(({propertyReactivity}) => delete propertyReactivity.cache)
    cacheWatchers.forEach(watcher => callWatcher(watcher, deep, { target, property, value }))
    watchers.filter(({cache}) => !cache).forEach(watcher => callWatcher(watcher, deep, { target, property, value }))
  }
  if (property) {
    const watchers = propertyReactivity(target, property).watchers
    propertyReactivity(target, property).watchers = []
    callWatchers(watchers)
  }
  const watchers = react.watchers
  react.watchers = []
  callWatchers(watchers)
}

export const setReactivity = ({ target, unreactive, original, object }) => {
  if (unreactive) return (target[reactivity] = false)
  if (original) (rootObjects).set(original, target)
  Object.defineProperty(target, reactivity, { value: { watchers: [], properties: new Map(), object }, configurable: true, writable: true })
  Object.defineProperty(target, '$watch', { value: watch(target), configurable: true, writable: true })
}

export const registerWatcher = (getter, watcher, options = {}) => {
  Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options))
  rootWatchers.push(watcher)
  const value = getter()
  rootWatchers.pop()
  return value
}

export const propertyReactivity = (target, property) => {
  const { properties } = target[reactivity]
  if (properties.has(property)) return properties.get(property)
  const propertyReactivity = {
    watchers: []
    // cache: undefined
  }
  properties.set(property, propertyReactivity)
  return propertyReactivity
}

export const pushWatcher = (object, watcher, options = {}) =>
  Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options)) &&
  object &&
  typeof object === 'object' &&
  object[reactivity] &&
  !object[reactivity].watchers.includes(watcher) &&
  object[reactivity].watchers.push(watcher)

export const includeWatcher = (arr, watcher) =>
  arr.includes(watcher) ||
  arr.some((_watcher) =>
    watcher.object &&
    watcher.property &&
    watcher.object === _watcher.object &&
    watcher.property === _watcher.property)

const pushCurrentWatcher = ({ watchers }) => {
  const currentWatcher = rootWatchers[rootWatchers.length - 1]
  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) watchers.push(currentWatcher)
}

export const registerDependency = ({ target, property }) => {
  if (!rootWatchers.length || !target[reactivity]) return
  if (property) pushCurrentWatcher(propertyReactivity(target, property))
  else pushCurrentWatcher(target[reactivity])
}

export const watch = target => (getter, handler) => {
  const options = target && typeof handler === 'object' ? handler : undefined
  if (target) {
    if (!handler || typeof handler !== 'function') {
      handler = getter
      getter = undefined
    }
    const type = typeof getter
    if (type === 'string' || type === 'number' || type === 'symbol') {
      const property = getter
      getter = _ => isBuiltIn(target) ? getProperty(target, property) : target[property]
    }
  }
  let unwatch, oldValue
  const watcher = _ => {
    if (unwatch) return
    if (getter) {
      let newValue = registerWatcher(getter, watcher, options)
      pushWatcher(newValue, watcher, options)
      if (handler) handler(newValue, oldValue)
      oldValue = newValue
    } else {
      handler(target, target)
      pushWatcher(target, watcher, options)
    }
  }
  if (getter) oldValue = registerWatcher(getter.bind(target, target), watcher, options)
  pushWatcher(getter ? oldValue : target, watcher, options)
  return _ => void (unwatch = true)
}

export const isolate = func => registerWatcher(func, _ => {})
