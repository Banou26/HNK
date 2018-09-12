import { reactivity, watch as _watch, rootObjects, getReactivityRoot, setReactivityRoot } from './utils.js'
import types from './types/index.js'

export {
  getReactivityRoot,
  setReactivityRoot
}

const reactify = (obj) => {
  if (!obj || typeof obj !== 'object' || (reactivity in obj)) return obj
  if (rootObjects.has(obj)) return rootObjects.get(obj)
  return Array.from(types).find(([type]) => obj instanceof type)[1](obj)
}

export const watch = _watch()

export {
  reactify as r,
  reactify as react,
  reactivity
}
