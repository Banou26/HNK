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
      useEffect = (effect, values) => {
        if (firstRun) {
          setTimeout(effect)
        } else if (!values || (state[index] && state[index]?.some((value, i) => !Object.is(value, values[i])))) {
          setTimeout(effect)
        }
        state[index] = values
      }

      const value = fn()

      useState = undefined
      useEffect = undefined

      return value
    }

    observer.next(run(true))

    return () => {}
  })
