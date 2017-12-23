export const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID)

export const isObject = item => item && typeof item === 'object' && !Array.isArray(item)

export function cloneObject (original) {
  if (!original || typeof original !== 'object') throw new TypeError(`Oz cloneObject: first argument has to be typeof 'object' & non null, typeof was '${typeof original}'`)
  if (original instanceof Map || original instanceof Set) return new (Object.getPrototypeOf(original).constructor)(cloneObject([...original]))
  let copiedProps = Array.isArray(original) ? [...original] : new ((Object.getPrototypeOf(original) || {}).constructor)()
  for (let i in original) {
    const desc = Object.getOwnPropertyDescriptor(original, i)
    let value, rest
    if (desc) ({value, ...rest} = desc)
    else value = original[i]
    if (!original || typeof value === 'object') value = cloneObject(value)
    if (desc) Object.defineProperty(copiedProps, i, {...rest, ...value && {value}})
    else copiedProps[i] = value
  }
  return copiedProps
}
