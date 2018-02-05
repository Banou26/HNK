import { watch } from '../reactivity/index.js'

export const bind = (obj, prop, event) => {
  const func = ({element}) => {
    element.value = obj[prop]
    let unwatch = watch(_ => obj[prop], value => (element.value = value))
    let event = element.addEventListener('input', ({target: {value}}) => event ? undefined : (obj[prop] = value))
    return _ => {
      unwatch()
      element.removeEventListener('input', event)
    }
  }
  func.directive = true
  return func
}
