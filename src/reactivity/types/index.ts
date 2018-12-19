import { reactivity } from '../utils'
import * as object from './object'
import * as array from './array'
import * as map from './map'
import * as set from './set'
import unreactive from './unreactive'

const builtIn = [
  map,
  set,
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
