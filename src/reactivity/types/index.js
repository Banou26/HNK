import { reactivity } from '../utils.js'
import * as object from './object.js'
import * as array from './array.js'
import * as map from './map.js'
import * as set from './set.js'
// import * as promise from './promise.js'
import unreactive from './unreactive.js'

const builtIn = [
  map,
  set,
  // promise,
  ...unreactive
]

export const isBuiltIn = reactiveObject => builtIn.find(({type}) => reactiveObject instanceof type)?.type

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

export const getProperty = (reactiveObject, property, _isBuiltIn = isBuiltIn(reactiveObject)) =>
  propertyGetters.has(_isBuiltIn)
    ? propertyGetters.get(_isBuiltIn)(reactiveObject, property)
    : reactiveObject[property]
