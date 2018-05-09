import types from './types/index.js'

export let reactiveRootSymbol = Symbol.for('OzReactiveRoot')
export let reactivitySymbol = Symbol.for('OzReactivity')
export let reactiveRoot = {
  watchers: [],
  objects: new WeakMap()
}

export const setReactiveRootSymbol = symbol => (reactiveRootSymbol = symbol)
export const setReactivitySymbol = symbol => (reactivitySymbol = symbol)
export const setReactiveRoot = _reactiveRoot => (reactiveRoot = _reactiveRoot)

export const reactivityProperties = ['$watch', reactivitySymbol]

export const setObjectReactivity = ({target, unreactive, original, object}) => {
  if (unreactive) return (target[reactivitySymbol] = false)
  if (original) reactiveRoot.objects.set(original, target)
  target[reactivitySymbol] = { watchers: [], properties: new Map(), object }
  Object.defineProperty(target, '$watch', { value: _watch(target) })
}

export const reactify = obj => {
  if (!obj || typeof obj !== 'object' || reactivitySymbol in obj) return obj
  if (reactiveRoot.objects.has(obj)) return reactiveRoot.objects.get(obj)
  const reactify = Array.from(types).find(([type]) => obj instanceof type)
  return reactify[1](obj)
}

export const notify = ({ target, property, value }) => {
  const reactivity = target[reactivitySymbol]
  if (!reactivity) return
  const callWatchers = watchers => {
    const currentWatcher = reactiveRoot.watchers[reactiveRoot.watchers.length - 1]
    if (watchers.includes(currentWatcher)) watchers.splice(watchers.indexOf(currentWatcher), 1)
    const cacheWatchers = watchers.filter(({cache}) => cache)/* .filter(({_target, _property}) => (target === _target && property === _property)) */
    cacheWatchers.forEach(({propertyReactivity}) => delete propertyReactivity.cache)
    cacheWatchers.forEach(watcher => watcher({ target, property, value }))
    watchers.filter(({cache}) => !cache).forEach(watcher => watcher({ target, property, value }))
  }
  if (property) {
    const watchers = propertyReactivity(target, property).watchers
    propertyReactivity(target, property).watchers = []
    callWatchers(watchers)
  } else {
    const watchers = reactivity.watchers
    reactivity.watchers = []
    callWatchers(watchers)
  }
}

export const registerWatcher = (getter, watcher, {object, property} = {}) => {
  watcher.object = object
  watcher.property = property
  reactiveRoot.watchers.push(watcher)
  const value = getter()
  reactiveRoot.watchers.pop()
  return value
}

export const propertyReactivity = (target, property) => {
  const properties = target[reactivitySymbol].properties
  if (properties.has(property)) return properties.get(property)
  const propertyReactivity = {
    watchers: []
    // cache: undefined
  }
  properties.set(property, propertyReactivity)
  return propertyReactivity
}

export const includeWatcher = (arr, watcher) => arr.some((_watcher) => watcher === _watcher ||
  (watcher.object && watcher.property && watcher.object === _watcher.object && watcher.property === _watcher.property))

const pushCurrentWatcher = ({watchers}) => {
  const currentWatcher = reactiveRoot.watchers[reactiveRoot.watchers.length - 1]
  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) watchers.push(currentWatcher)
}

export const registerDependency = ({ target, property }) => {
  const reactivity = target[reactivitySymbol]
  if (!reactiveRoot.watchers.length || !reactivity) return
  if (property) pushCurrentWatcher(propertyReactivity(target, property))
  else pushCurrentWatcher(reactivity)
}

const pushWatcher = (object, watcher) =>
  object &&
  typeof object === 'object' &&
  object[reactivitySymbol] &&
  !object[reactivitySymbol].watchers.some(_watcher => _watcher === watcher) &&
  object[reactivitySymbol].watchers.push(watcher)

const _watch = target => (getter, handler) => {
  if (target) {
    if (!handler) {
      handler = getter
      getter = undefined
    }
    if (typeof getter === 'string') {
      const property = getter
      getter = _ => target[property]
    }
  }
  let unwatch, oldValue
  const watcher = _ => {
    if (unwatch) return
    if (getter) {
      let newValue = registerWatcher(getter, watcher)
      pushWatcher(newValue, watcher)
      if (handler) handler(newValue, oldValue)
      oldValue = newValue
    } else {
      handler(target, target)
      pushWatcher(target, watcher)
    }
  }
  if (getter) oldValue = registerWatcher(getter.bind(target, target), watcher)
  pushWatcher(getter ? oldValue : target, watcher)
  return _ => (unwatch = true)
}

export const watch = _watch()

export {
  reactify as r,
  reactify as react
}
