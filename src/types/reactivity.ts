import { Reactivity } from '../reactivity/utils'
import { Observable } from 'rxjs'

export interface ReactivityObject {
  readonly observable: Observable<any>
}

export interface ReactiveObject {
  readonly [Reactivity]: ReactivityObject
}

export interface WatchOptions {
  readonly deep: Boolean
}

export interface Change {
  readonly value: any
  readonly oldValue?: any

  readonly changeDescription: ChangeDescription
}

export interface ChangeDescription {
  readonly object?: Object
  readonly property?: any

  readonly value: any
  readonly oldValue?: any

  readonly deep?: Boolean
}