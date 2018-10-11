import { r } from '../index.js'
import { setReactivity, notify, reactivity } from '../utils.js'

export const type = Promise

export const ReactiveType = class ReactivePromise extends Promise {
  constructor (executor, promise) {
    super((resolve, reject) => {
      executor(value => {
        let reactiveValue
        if (value && typeof value === 'object') {
          reactiveValue = r(value)
          const { object } = reactiveValue[reactivity]
          object.$promise = promise
          object.$resolved = true
          object.$resolvedValue = value
        }
        this.$resolved = true
        this.$resolvedValue = reactiveValue || value
        notify({ target: this })
        resolve(value)
      }, error => {
        this.$rejected = true
        this.$rejectedValue = error
        reject(error)
      })
    })
    setReactivity({target: this, original: promise, object: this})
    this.$promise = promise
    this.$resolved = false
    this.$rejected = false
  }
}

export default promise => new ReactiveType((resolve, reject) => promise.then(resolve).catch(reject), promise)
