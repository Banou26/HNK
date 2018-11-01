import { isBuiltIn, getProperty } from './types/index.js'

export const reactivity = Symbol.for('OzReactivity')

export const reactivityProperties = ['$watch', '$watchDependencies', reactivity]

export let rootWatchers = []
export let rootObjects = new WeakMap()

export const getReactivityRoot = _ => ({rootWatchers, rootObjects})
export const setReactivityRoot = ({watchers: w, objects: o}) => (rootWatchers = w) && (rootObjects = o)

const callWatcher = (watcher, deep, obj) =>
  deep
    ? watcher.deep
      ? watcher(obj, true)
      : undefined
    : watcher(obj, false)

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
    const _watchers = watchers.slice()
    watchers.length = 0
    callWatchers(_watchers)
  }
  const watchers = react.watchers
  const _watchers = watchers.slice()
  watchers.length = 0
  callWatchers(_watchers)
}

const makeReactivityWatcherArray = (target, property, dependencyListeners) => new Proxy([], {
  defineProperty (_target, _property, desc, { value } = desc/* desc */) {
    const oldValue = _target[_property]
    try {
      return Reflect.defineProperty(_target, _property, desc)
    } finally {
      if (_property === 'length' && oldValue !== value) {
        // console.log(oldValue, value, oldValue !== value)
        for (const watcher of dependencyListeners) watcher(target, property, value)
      }
    }
  }
})
class ReactivePropertyMap extends Map {
  constructor (dependencyListeners, object) {
    super()
    this.object = object
    this.dependencyListeners = dependencyListeners
  }

  set (key, val) {
    try {
      return super.set(key, val)
    } finally {
      for (const watcher of this.dependencyListeners) watcher(this.object, undefined, this, key, val)
    }
  }

  delete (key) {
    try {
      return super.delete(key)
    } finally {
      for (const watcher of this.dependencyListeners) watcher(this.object, undefined, this, key)
    }
  }
}

const makeReactivityObject = (object, dependencyListeners = []) => ({
  dependencyListeners,
  watchers: makeReactivityWatcherArray(object, undefined, dependencyListeners),
  properties: new Map(), // new ReactivePropertyMap(dependencyListeners, object),
  object
})

export const setReactivity = ({ target, unreactive, original, object }) => {
  if (unreactive) {
    target[reactivity] = false
    return target
  }
  if (original) (rootObjects).set(original, target)
  const reactivityObject = makeReactivityObject(object)
  Object.defineProperty(target, reactivity, { value: reactivityObject, configurable: true, writable: true })
  Object.defineProperty(target, '$watch', { value: watch(target), configurable: true, writable: true })
  Object.defineProperty(target, '$watchDependencies', {
    value: (listener) => {
      reactivityObject.dependencyListeners.push(listener)
      return _ => reactivityObject.dependencyListeners.splice(reactivityObject.dependencyListeners.indexOf(listener - 1), 1)
    },
    configurable: true,
    writable: true
  })
  return target
}

export const registerWatcher = (getter, watcher, options = {}) => {
  Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options))
  rootWatchers.push(watcher)
  const value = getter()
  rootWatchers.pop()
  return value
}

export const propertyReactivity = (target, property) => {
  const { properties, dependencyListeners } = target[reactivity]
  if (properties.has(property)) return properties.get(property)
  const propertyReactivity = {
    watchers: makeReactivityWatcherArray(target, property, dependencyListeners)
    // cache: undefined
  }
  properties.set(property, propertyReactivity)
  return propertyReactivity
}

export const pushWatcher = (object, watcher, options = {}) => {
  if (
    Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options)) &&
    object &&
    typeof object === 'object' &&
    object[reactivity] &&
    !object[reactivity].watchers.includes(watcher)
  ) {
    object[reactivity].watchers.push(watcher)
    watcher.dependenciesWatchers?.push(object[reactivity].watchers)
  }
}

export const includeWatcher = (arr, watcher) =>
  arr.includes(watcher) ||
  arr.some((_watcher) =>
    watcher.object &&
    watcher.property &&
    watcher.object === _watcher.object &&
    watcher.property === _watcher.property)

const pushCurrentWatcher = ({ watchers }) => {
  const currentWatcher = rootWatchers[rootWatchers.length - 1]
  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) {
    currentWatcher.dependenciesWatchers?.push(watchers)
    watchers.push(currentWatcher)
  }
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
  const dependenciesWatchers = []
  const watcher = (event, deep) => {
    dependenciesWatchers.length = 0
    if (unwatch) return
    if (getter) {
      let newValue = registerWatcher(getter, watcher, options)
      pushWatcher(newValue, watcher, options)
      if (handler) handler({ newValue, oldValue, event, deep })
      oldValue = newValue
    } else {
      handler({ newValue: target, oldValue: target, event, deep })
      pushWatcher(target, watcher, options)
    }
  }
  watcher.dependenciesWatchers = dependenciesWatchers
  if (getter) oldValue = registerWatcher(getter.bind(target, target), watcher, options)
  pushWatcher(getter ? oldValue : target, watcher, options)
  return _ => {
    for (const watchers of dependenciesWatchers) watchers.splice(watchers.indexOf(watcher) - 1, 1)
    unwatch = true
  }
}
