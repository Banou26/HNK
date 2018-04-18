export const promify = promise => {
  const func = _ => {}
  func.__promise__ = promise
  func.$resolved = false
  promise.then(_ => (func.$resolved = true))
  const proxy = new Proxy(func, {
    get (target, prop, receiver) {
      if (prop in func) return func[prop]
      if (prop in Promise.prototype) return typeof promise[prop] === 'function' ? promise[prop].bind(promise) : promise[prop]
      else {
        return new Promise(async (resolve, reject) => {
          try {
            resolve((await promise)[prop])
          } catch (err) { reject(err) }
        })
      }
    },
    async apply (target, thisArg, argumentsList) { return (await promise)(...argumentsList) }
  })
  return proxy
}
window.promify = promify
