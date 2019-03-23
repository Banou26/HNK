import { Observable, race } from 'rxjs'
import types from './types/index'
import { ReactiveObject } from './types'
import { hasReactive, getReactive } from './utils'

export const r = (object: Object | any): ReactiveObject | any => {
  if (!object || typeof object !== 'object') return object
  if (hasReactive(object)) return getReactive(object)
  return Array.from(types).find(([ type ]) => object instanceof (type as any))[1](object)
}

export {
  r as react,
  r as reactify
}

export const watch = (watcher: Function) =>
  Observable.create(observer => {
    

    
    return () => {

    }
  })