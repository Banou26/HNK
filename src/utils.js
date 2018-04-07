export const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID)

export const isObject = item => item && typeof item === 'object' && !Array.isArray(item)

export const flattenArray = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray(item)] : [...arr, item], [])

const ignoreObjectTypes = [
  Error,
  WeakSet,
  WeakMap,
  Node,
  Promise
]

// todo: add more of the built-in objects, some of them are in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const builtInObjects = new Map([
  [URL, {
    copy: url => new URL(url.href)
  }],
  [URLSearchParams, {
    copy: urlSearchParams => new URLSearchParams(urlSearchParams.toString())
  }],
  [RegExp, {
    copy: regexp => new RegExp(regexp.source, regexp.flags)
  }],
  [Map, {
    setters: ['clear', 'delete', 'set'],
    copy (original, {refs, during, after, ...rest}) {
      const _copy = new Map()
      const copy = during ? during(original, _copy) || _copy : _copy
      refs.set(original, copy)
      for (const [key, val] of cloneObject([...original], { refs, during, after, ...rest })) copy.set(key, val)
      if (after) {
        const afterReturn = after(original, copy)
        if (afterReturn) {
          refs.set(original, afterReturn)
          return afterReturn
        }
      }
      return copy
    }
  }],
  [Set, {
    setters: ['add', 'clear', 'delete'],
    copy (original, {refs, during, after, ...rest}) {
      const _copy = new Set()
      const copy = during ? during(original, _copy) || _copy : _copy
      refs.set(original, copy)
      for (const val of cloneObject([...original], { refs, during, after, ...rest })) copy.add(val)
      if (after) {
        const afterReturn = after(original, copy)
        if (afterReturn) {
          refs.set(original, afterReturn)
          return afterReturn
        }
      }
      return copy
    }
  }]
])
export const isIgnoredObjectType = obj => ignoreObjectTypes.some(type => obj instanceof type)
export const isBuiltIn = obj => [...builtInObjects].find(([type]) => obj instanceof type)

export function cloneObject (original = {}, { refs = new Map(), filter, before, during, after } = {}) {
  if (isIgnoredObjectType(original) || (filter && filter(original))) return original
  const args = { refs, filter, before, during, after }
  if (refs.has(original)) return refs.get(original)
  if (before) {
    const beforeReturn = before(original)
    if (beforeReturn) {
      refs.set(original, beforeReturn)
      return beforeReturn
    }
  }
  const builtInPair = isBuiltIn(original)
  if (builtInPair) return builtInPair[1].copy(original, args)
  const _object = Array.isArray(original) ? [...original] : Object.create(Object.getPrototypeOf(original))
  const object = during ? during(original, _object) || _object : _object
  refs.set(original, object)
  for (const [prop, desc] of Object.entries(Object.getOwnPropertyDescriptors(original))) {
    let {value, ...rest} = desc
    Object.defineProperty(object, prop, {
      ...rest,
      ...value !== undefined && {
        value: value && typeof value === 'object'
          ? cloneObject(value, args)
          : value
      }
    })
  }
  if (after) {
    const afterReturn = after(original, object)
    if (afterReturn) {
      refs.set(original, afterReturn)
      return afterReturn
    }
  }
  return object
}

export const getPropertyDescriptorPair = (prototype, property) => {
  let descriptor = Object.getOwnPropertyDescriptor(prototype, property)
  while (!descriptor) {
    prototype = Object.getPrototypeOf(prototype)
    if (!prototype) return
    descriptor = Object.getOwnPropertyDescriptor(prototype, property)
  }
  return {prototype, descriptor}
}

export const hasProperty = (object, property) => {
  return !!getPropertyDescriptorPair(object, property)
}

export const getPropertyDescriptor = (object, property) => {
  const result = getPropertyDescriptorPair(object, property)
  if (result) return result.descriptor
}
export const getPropertyDescriptorPrototype = (object, property) => {
  const result = getPropertyDescriptorPair(object, property)
  if (result) return result.prototype
}
