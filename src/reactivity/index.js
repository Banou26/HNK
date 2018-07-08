import { reactivity, watch as _watch } from './utils.js'
import types from './types/index.js'

export let watchers = []
export let objects = new WeakMap()

export const getRoot = _ => ({watchers, objects})
export const setRoot = ({watchers: w, objects: o}) => (watchers = w) && (objects = o)

export let cloning
export let cloningRefs

const reactify = (obj, { immutable = false, deep = false } = {}) => {
  if (immutable) {
    cloning = true
    cloningRefs = new WeakMap()
  }
  if (!obj || typeof obj !== 'object' || (reactivity in obj && cloning && cloningRefs.has(obj))) return obj
  if (cloning ? cloningRefs.has(obj) : objects.has(obj)) return cloning ? cloningRefs.get(obj) : objects.get(obj)
  const reactify = Array.from(types).find(([type]) => obj instanceof type)
  try {
    return reactify[1](obj)
  } finally {
    if (immutable) {
      cloning = false
      cloningRefs = undefined
    }
  }
}

export const watch = _watch()

export {
  reactify as r,
  reactify as react,
  reactivity
}
