import { watch } from '../reactivity/index.js'

export const bind = (obj, prop, event) => {
  const func = ({getElement}) => {
    const element = getElement()
    const type = element.getAttribute('type')
    const _prop =
    type === 'checkbox'
      ? 'checked'
      : 'value'
    element[_prop] = obj[prop]
    let unwatch = watch(_ => obj[prop], value => (element[_prop] = value))
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
