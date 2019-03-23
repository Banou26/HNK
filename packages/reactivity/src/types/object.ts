import { setReactive, setReactivity } from '../utils'
import proxify from '../proxy'

export const type = Object

export default object => {
  const proxy = proxify(Object.create(Object.getPrototypeOf(object)))
  setReactive(object, proxy)
  setReactivity(proxy)
  // @ts-ignore
  for (const [prop, {value, ...rest}] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
    Object.defineProperty(proxy, prop, {
      ...value !== undefined && { value: value },
      ...rest
    })
  }
  return proxy
}
