import { cloneObject } from '../util/index.js'

export let defaultReactiveRoot = {
  watcher: null
}

export const setDefaultReactiveRoot = reactiveRoot => (defaultReactiveRoot = reactiveRoot)

const registerWatcher = (reactiveRoot, getter, watcher) => {
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
    properties: {}
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
      const result = Object.getOwnPropertyDescriptor(target, prop).value || Object.getOwnPropertyDescriptor(target, prop).get ? Reflect.get(target, prop, receiver) : reactify(Reflect.get(target, prop, receiver), reactiveRoot)
      // console.log('get', target, prop, result, receiver, Object.getOwnPropertyDescriptor(target, prop))
      const propReactivity = reactivity.properties[prop]
      const propWatchers = propReactivity.watchers
      if (reactiveRoot.watcher) {
        if (!propWatchers.includes(reactiveRoot.watcher)) propWatchers.push(reactiveRoot.watcher)
        if (!reactivity.watchers.includes(reactiveRoot.watcher)) reactivity.watchers.push(reactiveRoot.watcher)
        if (result && typeof result === 'object' && !result.__reactivity__.watchers.includes(reactiveRoot.watcher)) result.__reactivity__.watchers.push(reactiveRoot.watcher)
      }
      return result
    },
    set (target, prop, _value, receiver) {
      if (prop in target && !isEnumerable(target, prop)) return Reflect.set(target, prop, _value, receiver)
      if (!reactivity.properties[prop]) reactivity.properties[prop] = defaultPropertyReactivity()
      let value = _value
      if (_value && typeof _value === 'object') value = reactify(_value)
      const result = Reflect.set(target, prop, value, receiver)
      // console.log('set', target, prop, _value, receiver)
      const propReactivity = reactivity.properties[prop]
      const propWatchers = [...propReactivity.watchers]
      const objWatchers = [...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []
      propWatchers.map(watcher => watcher())
      objWatchers.map(watcher => watcher())
      return result
    },
    deleteProperty (target, prop) {
      if (!isEnumerable(target, prop)) return Reflect.deleteProperty(target, prop)
      const propReactivity = reactivity.properties[prop]
      const result = Reflect.deleteProperty(target, prop)
      // console.log('delete', target, prop)
      const propWatchers = [...propReactivity.watchers]
      const objWatchers = [...reactivity.watchers]
      propReactivity.watchers = []
      reactivity.watchers = []
      propWatchers.map(watcher => watcher())
      objWatchers.map(watcher => watcher())
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
          let newValue = registerWatcher(reactiveRoot, getter.bind(proxy), watcher)
          handler(newValue, oldValue)
          oldValue = newValue
        } else {
          handler(proxy, proxy)
          reactivity.watchers.push(watcher)
        }
      }
      if (getter) oldValue = registerWatcher(reactiveRoot, getter.bind(proxy), watcher)
      else reactivity.watchers.push(watcher)
      return _ => (unwatch = true)
    }
  })
  return proxy
}
