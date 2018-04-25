import { reactivitySymbol } from '../index.js'

export const type = RegExp

export default regexp => {
  regexp[reactivitySymbol] = false
  return regexp
}
