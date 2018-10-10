import { r } from '../index.js'
import { setReactivity, notify, reactivity } from '../utils.js'

export const type = Promise

const promisify = _promise => {
  const promise = _promise.then()
  Object.defineProperty(promise, '$promise', { value: promise })
  Object.defineProperty(promise, '$resolved', { value: false })
  const proxy = new Proxy(promise, {
    get: (target, prop, receiver) =>
      prop in target
        ? typeof target[prop] === 'function'
          ? target[prop].bind(target)
          : target[prop]
        : promisify(target.then(val => val?.[prop]))
  })
  setReactivity({ target: proxy, object: promise, original: promise })
  promise.then(value => {
    if (value && typeof value === 'object') {
      const reactiveValue = r(value)
      const { object } = reactiveValue[reactivity]
      Object.defineProperty(object, '$promise', { value: promise })
      Object.defineProperty(object, '$resolved', { value: true })
      Object.defineProperty(object, '$resolvedValue', { value })
    }
    notify({ target: proxy })
  }).catch(err => err)
  return proxy
}
export default promisify
