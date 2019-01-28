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

export const isBuiltIn =
  reactiveObject =>
    builtIn
    .find(({ type }) =>
      reactiveObject instanceof type)?.type

// Has to be from most specific(e.g: Map) to less specific(Object)
export default new Map<Object, Function>([
  ...builtIn,
  array,
  object
].map(({ type, default: react }): [Object, Function] =>
  [type, react]))

export const propertyGetters = new Map([
  map,
  set
].map(({ type, getProperty }): [Object, Function] =>
  [type, getProperty]))

export const getProperty = (reactiveObject, property) => {
  const getProperty = propertyGetters.get(isBuiltIn(reactiveObject))
  return getProperty
          ? getProperty(reactiveObject, property)
          : reactiveObject[property]
}
