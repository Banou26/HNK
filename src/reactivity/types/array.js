import { r, setObjectReactivity } from '../index.js'
import proxify from '../proxy.js'

export const type = Array

export default array => {
  const reactiveArray = proxify([])
  setObjectReactivity({target: reactiveArray, original: array})
  array.forEach((val, i) => (reactiveArray[i] = r(val)))
  return reactiveArray
}
