export const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID)

export const isObject = item => item && typeof item === 'object' && !Array.isArray(item)

export const flattenArray = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray(item)] : [...arr, item], [])

const replaceObject = (object, replace) => replace ? replace(object) : object

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
    copy (map, {refs, replaceObjects, ...rest}) {
      const newMap = replaceObject(new Map(), replaceObjects)
      refs.set(map, newMap)
      for (const [key, val] of cloneObject([...map], { refs, ...rest, registerRef: false, replaceObjects })) newMap.set(key, val)
      return newMap
    }
  }],
  [Set, {
    setters: ['add', 'clear', 'delete'],
    copy (set, {refs, replaceObjects, ...rest}) {
      const newSet = replaceObject(new Set(), replaceObjects)
      refs.set(set, newSet)
      for (const val of cloneObject([...set], { refs, ...rest, registerRef: false, replaceObjects })) newSet.add(val)
      return newSet
    }
  }]
])

export const isBuiltIn = obj => {
  for (const pair of builtInObjects) {
    if (obj instanceof pair[0]) return pair
  }
}

const ignoreObjectType = [
  WeakSet,
  WeakMap,
  Node
]

export const isIgnoredObjectType = obj => {
  for (const type of ignoreObjectType) {
    if (obj instanceof type) return obj
  }
}

export function cloneObject (_object = {}, { refs = new Map(), registerRef = true, replaceObjects, doNotCopyObjects } = {}) {
  if (refs.has(_object)) return refs.get(_object)
  if (!_object || typeof _object !== 'object') throw new TypeError(`Oz cloneObject: first argument has to be typeof 'object' & non null, typeof was '${typeof _object}'`)
  if (isIgnoredObjectType(_object)) return _object
  if (doNotCopyObjects && doNotCopyObjects(_object)) return _object
  const builtInPair = isBuiltIn(_object)
  if (builtInPair) return builtInPair[1].copy(_object, { refs, replaceObjects })
  const object = replaceObject(Array.isArray(_object) ? [..._object] : Object.create(Object.getPrototypeOf(_object)), replaceObjects)
  if (registerRef) refs.set(_object, object)
  for (const [prop, desc] of Object.entries(Object.getOwnPropertyDescriptors(_object))) {
    let {value, ...rest} = desc
    if (desc.writable === false) continue
    Object.defineProperty(object, prop, {
      ...rest,
      ...value !== undefined && {
        value: value && typeof value === 'object'
          ? cloneObject(value, { refs, replaceObjects, doNotCopyObjects })
          : value
      }
    })
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
