import { setReactive, setReactivity } from '../utils'
import proxify from '../proxy'
import { r } from '../index'
import { ReactiveObject } from '../../types'

export const type = Array

let original: any[]
// todo @banou26: try to fix the typescript Proxy Array typing problem
export const ReactiveType = class ReactiveArray extends Array /* implements ReactiveObject */ {
  constructor (...values) {
    super()
    const proxy = proxify(this)
    setReactive(original, proxy)
    setReactivity(proxy)
    Object.assign(proxy, Array.from(values).map((val, i) => this[i] = r(val)))
    if (original) original = undefined
    return proxy as unknown as any[]
  }
}

export default array =>
  new ReactiveType(...(original = array))
