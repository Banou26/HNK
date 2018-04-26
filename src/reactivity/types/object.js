import { r, setObjectReactivity } from '../index.js'
import proxify from '../proxy.js'

export const type = Object

export default object => {
  const obj = Object.create(Object.getPrototypeOf(object))
  const reactiveObject = proxify(obj)
  setObjectReactivity({target: reactiveObject, original: object, object: obj})
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([prop, {value, ...rest}]) => Object.defineProperty(reactiveObject, prop, {
    ...value !== undefined && { value: r(value) },
    ...rest
  }))
  return reactiveObject
}
