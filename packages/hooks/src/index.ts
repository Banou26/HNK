import { Observable } from 'rxjs'

export let useState
export let useEffect

export const withHooks = fn =>
  Observable.create(observer => {
    const state = {}
    const run = (firstRun = false) => {
      let index = 0
      useState = initialValue => {
        let currentIndex = index
        if (firstRun) state[currentIndex] = initialValue
        const tuple =
          [
            state[currentIndex],
            newValue => {
              if (Object.is(newValue, state[currentIndex])) return
              state[currentIndex] = newValue
              observer.next(run())
            }
          ]
        index++
        return tuple
      }
      useEffect = (fn, values) => {
        if (firstRun) fn()
        if (!state[index].some((value, i) => !Object.is(value, values[i]))) return
        state[index] = values
        if (!firstRun) fn()
      }

      const value = fn()

      useState = undefined
      useEffect = undefined

      return value
    }

    observer.next(run(true))

    return () => {}
  })
