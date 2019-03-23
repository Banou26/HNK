import { setReactivity } from '../utils'
import proxify from '../proxy'

export const type = Object

export default object => {
  const obj = Object.create(Object.getPrototypeOf(object))
  const reactiveObject = proxify(obj)
  setReactivity({target: reactiveObject, original: object, object: obj})
  for (const [prop, {value, ...rest}] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
    Object.defineProperty(reactiveObject, prop, {
      ...value !== undefined && { value: value },
      ...rest
    })
  }
  return reactiveObject
}
