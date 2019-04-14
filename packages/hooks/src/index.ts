import { Observable } from 'rxjs'

enum HookType {
  state,
  effect
}

export let useState:  <T>(initialValue: T) => [T, (value: T) => void]
export let useEffect: (effect: Function, values: any[]) => void

export const withHooks = <T>(fn: () => T): Observable<T> =>
  Observable.create(observer => {
    const states = new Map()
    const effects = new Map()
    const refs = new Map()

    const run = (firstRun = false) => {
      let index = 0
      let nextRunQueued

      useState = initialValue => {
        const currentIndex = index
        if (firstRun) states.set(currentIndex, initialValue)
        const value = states.get(currentIndex)
        const tuple: [any, (value: any) => void] =
          [
            value,
            (newValue: any) => {
              if (Object.is(newValue, value)) return
              states.set(currentIndex, newValue)
              if (!nextRunQueued) {
                nextRunQueued = true
                setTimeout(() => observer.next(run()))
              }

            }
          ]
        index++
        return tuple
      }
      useEffect = (effect, newValues) => {
        if (!(newValues === undefined || Array.isArray(newValues))) throw new Error('useEffect second argument should either be undefined or an Array')
        const currentIndex = index
        const values = effects.get(currentIndex)?.[1]
        if (firstRun || !newValues || newValues?.some((value, i) =>!Object.is(value, values?.[i]))) {
          effects.set(currentIndex, [effect, newValues])
        }
        index++
      }

      const lastEffects = Array.from(effects)
      const value = fn()

      setTimeout(() => {
        lastEffects
          .filter(([i]) =>
            effects.get(i)[1]?.some((value, i2) =>
              !Object.is(value, effects.get(i)[i2])))
          .forEach(([, [cleanup]]) => cleanup?.())

        effects
          .forEach(([effect], i) =>
            typeof effect === 'function' &&
            (effects.get(i)[0] = effect()))
      })

      useState = undefined
      useEffect = undefined

      return value
    }

    observer.next(run(true))

    return () => {}
  })
