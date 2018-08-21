import { reactivity, watch as _watch } from './utils.js'
import types from './types/index.js'

export let watchers = []
export let objects = new WeakMap()

export const getReactivityRoot = _ => ({watchers, objects})
export const setReactivityRoot = ({watchers: w, objects: o}) => (watchers = w) && (objects = o)

const reactify = (obj) => {
  if (!obj || typeof obj !== 'object' || (reactivity in obj)) return obj
  if (objects.has(obj)) return objects.get(obj)
  return Array.from(types).find(([type]) => obj instanceof type)[1](obj)
}

export const watch = _watch()

export {
  reactify as r,
  reactify as react,
  reactivity
}
