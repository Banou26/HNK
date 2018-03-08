import { watch } from '../reactivity/index.js'

export const bind = (obj, prop, event) => {
  const func = ({element}) => {
    element.value = obj[prop]
    let unwatch = watch(_ => obj[prop], value => (element.value = value))
    const listener = ({target: {value}}) => event ? undefined : (obj[prop] = value)
    let event = element.addEventListener('input', listener)
    return _ => {
      unwatch()
      element.removeEventListener('input', listener)
    }
  }
  func.directive = true
  return func
}
