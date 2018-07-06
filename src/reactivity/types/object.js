import { setReactivity } from '../utils.js'
import proxify from '../proxy.js'

export const type = Object

export default object => {
  const obj = Object.create(Object.getPrototypeOf(object))
  const reactiveObject = proxify(obj)
  setReactivity({target: reactiveObject, original: object, object: obj})
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([prop, {value, ...rest}]) =>
    Object.defineProperty(reactiveObject, prop, {
      ...value !== undefined && { value: value },
      ...rest
    }))
  return reactiveObject
}
