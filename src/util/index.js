export const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID)

export const isObject = item => item && typeof item === 'object' && !Array.isArray(item)

export function cloneArray (array) {
  if (!Array.isArray(array)) throw new TypeError(`Oz cloneArray: first argument has to be an array, typeof was '${typeof original}'`)
  return [...array.map(item => {
    if (isObject(item)) return cloneObject(item)
    else if (Array.isArray(item)) return cloneArray(item)
    else return item
  })]
}

export function cloneObject (original) {
  if (Array.isArray(original)) return cloneArray(original)
  else if (!isObject(original)) throw new TypeError(`Oz cloneObject: first argument has to be typeof 'object', typeof was '${typeof original}'`)
  let copiedProps = Object.create(Object.getPrototypeOf(original)) // to allow the clonedObject instanceof originalObject class
  for (let i in original) {
    const {value, ...rest} = Object.getOwnPropertyDescriptor(original, i)
    let newValue
    if (isObject(value)) newValue = cloneObject(value)
    else if (Array.isArray(value)) newValue = cloneArray(value)
    else newValue = value
    const newPropDesc = {...rest}
    if (newValue) newPropDesc.value = newValue
    Object.defineProperty(copiedProps, i, newPropDesc)
  }
  return copiedProps
}
