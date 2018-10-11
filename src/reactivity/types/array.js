import { setReactivity } from '../utils.js'
import proxify from '../proxy.js'

export const type = Array

let original
export const ReactiveType = class ReactiveArray extends Array {
  constructor (...values) {
    super()
    const proxy = proxify(this)
    setReactivity({target: proxy, original, object: this})
    if (original) original = undefined
    if (values) {
      for (const val of values) proxy.push(val)
    }
    values.forEach((val, i) => (proxy[i] = val))
    return proxy
  }
}

export default array => {
  original = array
  return new ReactiveType(...array)
}
