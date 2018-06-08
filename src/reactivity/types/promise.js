import { r, setObjectReactivity, notify, reactivitySymbol } from '../index.js'

export const type = Promise

const promisify = promise => {
  const func = _ => {}
  Object.defineProperty(func, '$promise', {value: promise})
  Object.defineProperty(func, '$resolved', {value: false})
  const proxy = new Proxy(func, {
    get (target, prop, receiver) {
      if (prop in func) return func[prop]
      if (prop in Promise.prototype) return typeof promise[prop] === 'function' ? promise[prop].bind(promise) : promise[prop]
      else {
        return promisify(new Promise(async (resolve, reject) => {
          try {
            resolve((await promise)[prop])
          } catch (err) { reject(err) }
        }))
      }
    },
    async apply (target, thisArg, argumentsList) { return (await promise).apply(thisArg, argumentsList) }
  })
  setObjectReactivity({target: proxy, object: func, original: promise})
  promise.then(value => {
    if (value && typeof value === 'object') {
      const reactiveValue = r(value)
      const { object } = reactiveValue[reactivitySymbol]
      Object.defineProperty(object, '$promise', {value: promise})
      Object.defineProperty(object, '$resolved', {value: true})
      Object.defineProperty(object, '$resolvedValue', {value})
    }
    notify({target: proxy})
  })
  return proxy
}
export default promisify
