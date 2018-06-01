import { notify, registerDependency, reactivitySymbol } from '../index.js'
import * as map from './map.js'
import * as set from './set.js'
import * as node from './node.js'
import * as regexp from './regexp.js'
import * as promise from './promise.js'
import * as array from './array.js'
import * as object from './object.js'

const builtIn = [
  map,
  set,
  node,
  promise,
  regexp
]

export default new Map([
  ...builtIn,
  array,
  object
].map(({type, default: reactify}) => ([type, reactify])))

for (const { type, ReactiveType, reactivePrototype } of builtIn) {
  if (!ReactiveType) continue
  const mapDescriptors = Object.getOwnPropertyDescriptors(type.prototype)
  for (const prop of [...Object.getOwnPropertyNames(mapDescriptors), ...Object.getOwnPropertySymbols(mapDescriptors)]) {
    const { notify: _notify } = reactivePrototype.get(prop) || {}
    if (!ReactiveType.prototype.hasOwnProperty(prop)) {
      const desc = mapDescriptors[prop]
      Object.defineProperty(ReactiveType.prototype, prop, {
          ...desc,
          ...'value' in desc && typeof desc.value === 'function' && {
            value: function (...args) {
              return type.prototype[prop].apply(this[reactivitySymbol].object, args)
              // try {
              //   return type.prototype[prop].apply(this[reactivitySymbol].object, args)
              // } finally {
              //   registerDependency({ target: this })
              //   if (_notify) notify({ target: this })
              // }
            }
          }/*,
          ...'get' in desc && desc.get && {
            get () {
              try {
                return Reflect.get(type.prototype, prop, this[reactivitySymbol].object)
              } finally {
                registerDependency({ target: this, property: prop })
              }
            }
          }*/
        })
    }
  }
}
