import { reactivity } from '../utils.js'
import * as object from './object.js'
import * as array from './array.js'
import * as map from './map.js'
import * as set from './set.js'
import * as regexp from './regexp.js'
import * as promise from './promise.js'
import * as node from './node.js'

const builtIn = [
  map,
  set,
  regexp,
  promise,
  node
]

export const isBuiltIn = reactiveObject => (builtIn.find(({type}) => reactiveObject instanceof type) || {}).type

// Has to be from most specific(e.g: Map) to less specific(Object)
export default new Map([
  ...builtIn,
  array,
  object
].map(({type, default: reactify}) => ([type, reactify])))

export const propertyGetters = new Map([
  ...builtIn,
  array,
  object
].map(({type, getProperty}) => ([type, getProperty])))

export const getProperty = (reactiveObject, property) =>
  (propertyGetters.get(isBuiltIn(reactiveObject)) ||
    (_ => reactiveObject[property]))(reactiveObject, property)

for (const { type, ReactiveType } of builtIn) {
  if (!ReactiveType) continue
  const mapDescriptors = Object.getOwnPropertyDescriptors(type.prototype)
  for (const prop of [...Object.getOwnPropertyNames(mapDescriptors), ...Object.getOwnPropertySymbols(mapDescriptors)]) {
    if (!ReactiveType.prototype.hasOwnProperty(prop)) {
      const desc = mapDescriptors[prop]
      Object.defineProperty(ReactiveType.prototype, prop, {
        ...desc,
        ...'value' in desc && typeof desc.value === 'function' && {
          value: function (...args) {
            return type.prototype[prop].apply(this[reactivity].object, args)
          }
        }
      })
    }
  }
}
