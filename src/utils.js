import { OzElement } from './elements/utils.js'

export const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID)

export const getPropertyDescriptorPair = (prototype, property) => {
  let descriptor = Object.getOwnPropertyDescriptor(prototype, property)
  while (!descriptor) {
    prototype = Object.getPrototypeOf(prototype)
    if (!prototype) return
    descriptor = Object.getOwnPropertyDescriptor(prototype, property)
  }
  return {prototype, descriptor}
}

export const hasProperty = (object, property) => !!getPropertyDescriptorPair(object, property)

export const getPropertyDescriptor = (object, property) =>
  (getPropertyDescriptorPair(object, property) || {}).descriptor

export const getPropertyDescriptorPrototype = (object, property) =>
  (getPropertyDescriptorPair(object, property) || {}).prototype

export const getClosestOzElementParent = (
  node,
  parentNode = node.parentNode || node.host,
  isOzElement = parentNode && parentNode[OzElement]
) =>
  isOzElement
    ? parentNode
    : parentNode && getClosestOzElementParent(parentNode)
