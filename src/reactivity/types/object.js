import { setObjectReactivity } from '../index.js'
import proxify from '../proxy.js'

export const type = Object

export default object => {
  const reactiveObject = proxify(Object.create(Object.getPrototypeOf(object)))
  setObjectReactivity({target: reactiveObject, original: object})
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([prop, desc]) => Object.defineProperty(reactiveObject, prop, desc))
  return reactiveObject
}
