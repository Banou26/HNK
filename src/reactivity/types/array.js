import { r, setObjectReactivity } from '../index.js'
import proxify from '../proxy.js'

export const type = Array

export default array => {
  const arr = []
  const reactiveArray = proxify(arr)
  setObjectReactivity({target: reactiveArray, original: array, object: arr})
  array.forEach((val, i) => (reactiveArray[i] = r(val)))
  return reactiveArray
}
