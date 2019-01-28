import { setReactivity } from '../utils'
import proxify from '../proxy'
import { r } from '../index'

export const type = Array

let original
export const ReactiveType = class ReactiveArray extends Array {
  constructor (...values) {
    super(...values.map(val => r(val)))
    const proxy = proxify(this)
    setReactivity({target: proxy, original, object: this})
    if (original) original = undefined
    return proxy
  }
}

export default array => {
  original = array
  return new ReactiveType(...array)
}
