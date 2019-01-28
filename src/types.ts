import { Subject } from 'rxjs'

export interface Change<T> {
  readonly proxy: Object
  readonly object: Object
  readonly property: keyof T
  readonly value: any
  readonly oldValue: any
  readonly delete: Boolean
  readonly descriptor: PropertyDescriptor
}

export interface ChangeSubject<T> extends Subject<Change<T>> {}
export interface PropertyMap<K extends keyof T, T> extends Map<K, ChangeSubject<T>> {}

export interface Reactivity<T> {
  readonly changes: ChangeSubject<T>
  readonly properties: PropertyMap<keyof T, T>
}

export interface ReactiveObject extends ProxyConstructor {}
export interface NativeReactiveObject {}