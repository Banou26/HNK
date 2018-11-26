import { getProperty } from './types/index.js'

export const reactivity = Symbol.for('OzReactivity')

export const reactivityProperties = ['$watch', '$watchDependencies', reactivity]

export let rootWatchers = []
export let rootObjects = new WeakMap()

export const getReactivityRoot = _ => ({rootWatchers, rootObjects})
export const setReactivityRoot = ({watchers: w, objects: o}) => (rootWatchers = w) && (rootObjects = o)

const isGenerator = val => val?.[Symbol.toStringTag] === 'AsyncGeneratorFunction'

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

export const registerWatcher = (getter, watcher) => {
  rootWatchers.push(watcher)
  try {
    return getter()
  } finally {
    rootWatchers.pop()
  }
}

export const propertyReactivity = (target, property) => {
  const { properties, dependencyListeners } = target[reactivity]
  if (properties.has(property)) return properties.get(property)
  const propertyReactivity = {
    watchers: makeReactivityWatcherArray(target, property, dependencyListeners)
    // cache: undefined // is commented because if the cache property is set, then it use this value as cached value
  }
  properties.set(property, propertyReactivity)
  return propertyReactivity
}

export const pushWatcher = (object, watcher) => {
  if (
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
  const options = { dependenciesWatchers: [], autoRun: true, returnAtChange: true }
  if (target && typeof handler === 'object') Object.defineProperties(options, Object.getOwnPropertyDescriptors(handler))
  if (target) {
    if (!handler || typeof handler !== 'function') {
      handler = getter
      getter = undefined
    }
    const type = typeof getter
    if (type === 'string' || type === 'number' || type === 'symbol') {
      const property = getter
      getter = _ => getProperty(target, property)
    }
  }
  const isGetterGenerator = isGenerator(getter)
  let unregister, oldValue
  const watcher = (event, deep) => {
    options.dependenciesWatchers.length = 0 // Empty the dependenciesWatchers array
    if (unregister) return // Return without registering the watcher
    if (getter) { // If there's a getter function
      if (isGetterGenerator) {
        if (options.returnAtChange) oldValue?.return()
        const iterator = getter()
        const _next = iterator.next.bind(iterator)
        let previousValue
        iterator.next = (...args) => {
          let resolve, reject
          const promise = new Promise((_resolve, _reject) => (resolve = _resolve) && (reject = _reject))
          promise.finally(_ => rootWatchers.pop())
          if (!previousValue) rootWatchers.push(watcher)
          const value = _next(args.length ? args[0] : previousValue)
          if (!previousValue) rootWatchers.pop()
          value.finally(_ => rootWatchers.push(watcher))
          value.then(resolve).catch(reject)
          previousValue = value
          return value
        }
        if (options.autoRun) {
          const autoRun = promise =>
          promise && promise.then(({done}) => !done && autoRun(iterator.next()))
          autoRun(iterator.next())
        }
        if (handler) handler({ newValue, oldValue, event, deep })
        oldValue = iterator
      } else {
        let newValue = registerWatcher(getter, watcher)
        if (handler) handler({ newValue, oldValue, event, deep })
        oldValue = newValue
      }
    } else {
      handler({ newValue: target, oldValue: target, event, deep })
      pushWatcher(target, watcher)
    }
  }
  if (options) Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options))
  if (getter) {
    if (isGetterGenerator) watcher()
    else oldValue = registerWatcher(getter.bind(target, target), watcher)
  }
  pushWatcher(getter ? oldValue : target, watcher)
  return {
    value: oldValue,
    unregister: _ => {
      for (const watchers of options.dependenciesWatchers) watchers.splice(watchers.indexOf(watcher) - 1, 1)
      unregister = true
    },
    abort: undefined
  }
}
