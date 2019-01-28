import { Subject, Observable } from 'rxjs'
import { Reactivity, ReactiveObject, ChangeSubject, Change, PropertyMap, NativeReactiveObject } from '../types'

const isAsyncGenerator = val => val?.[Symbol.toStringTag] === 'AsyncGeneratorFunction'

const sourceMap = new WeakMap<Object, ReactiveObject | NativeReactiveObject>()
const reactivityMap: WeakMap<Object, Reactivity<Object>> = new WeakMap()
export let changeSubjectStack: ChangeSubject<any>[][]

export const setReactive =
  (object: Object, reactiveObject: ReactiveObject | NativeReactiveObject): void =>
    void sourceMap.set(object, reactiveObject)

export const hasReactive =
  (object: Object): Boolean =>
    sourceMap.has(object)

export const getReactive =
(object: Object): ReactiveObject | NativeReactiveObject =>
    sourceMap.get(object)

export const setReactivity =
  (object: Object): void =>
    void reactivityMap.set(object, {
      changes: new Subject(),
      properties: new Map()
    })

export const getReactivity =
  <T extends Object>(object: Object): Reactivity<T> =>
    reactivityMap.get(object)

export const hasReactivity =
  (object: Object): Boolean =>
    reactivityMap.has(object)

const yieldAsAwait = async (iterator, promise) =>
  !((await promise)?.done) && yieldAsAwait(iterator, iterator.next())

// Time for some promise callstack black magic
const getAsyncIteratorDependencies = 
  ({ next, stack, value, previousValue }) => {
    let resolve, reject
    const promise = new Promise((_resolve, _reject) => (resolve = _resolve) && (reject = _reject))
    promise.finally(() => changeSubjectStack.pop())
    if (!previousValue) changeSubjectStack.push(stack)
    const newValue = next(value || previousValue)
    if (!previousValue) changeSubjectStack.pop()
    newValue.finally(() => changeSubjectStack.push(stack))
    newValue.then(resolve).catch(reject)
    return newValue
  }

export const observeAsyncIteratorYields =
  iterator => {
    const subject = new Subject()
    const newIterator = {
      [Symbol.iterator]: _ => newIterator,
      async next (_value) {
        const { value, done } = await iterator.next(_value)
        subject.next(value)
        if (done) subject.complete()
        return { value, done }
      },
      throw (err) {
        subject.error(err)
        iterator.throw(err)
      }
    }
    return {
      observable: subject,
      iterator: newIterator
    }
  }

export const observeAsyncIteratorDependencies =
  (iterator: AsyncIterator<Promise<any>>): Observable<ChangeSubject<any>> =>
    Observable.create(observer => {
      let previousValue, unsubscribed
      const next = async (value = undefined) => {
        if (unsubscribed) return
        let resolve, reject
        const promise = new Promise((_resolve, _reject) => (resolve = _resolve) && (reject = _reject))
        promise.finally(() => changeSubjectStack.pop())
        if (!previousValue) changeSubjectStack.push(observer)
        const newPromiseValue = iterator.next(value || previousValue)
        if (!previousValue) changeSubjectStack.pop()
        newPromiseValue.finally(() => changeSubjectStack.push(observer))
        try {
          const { done, value: newValue } = await newPromiseValue
          previousValue = newValue
          resolve()
          if (done) return newValue
          else if (!done && !unsubscribed) return next(newValue)
        } catch (err) {
          reject(err)
        }
      }
      next()
      return _ => (unsubscribed = true)
    })

export const getDependencies =
  (iteratorMiddleware: Function) =>
    (watcher: Function):
    { value: any, dependencies: ChangeSubject<any>[] } => {
      const stack: ChangeSubject<any>[] = []

      changeSubjectStack.push(stack)
      const value = watcher()
      changeSubjectStack.pop()

      if (value[Symbol.iterator]) {
        const iterator = watcher()
        const next = iterator.next.bind(iterator)
        let previousValue

        iterator.next = value =>
          (previousValue = getAsyncIteratorDependencies({ next, stack, value, previousValue }))

        return {
          value: (iteratorMiddleware || yieldAsAwait)(iterator),
          dependencies: stack
        }
      }

      return {
        value,
        dependencies: stack
      }
    }
