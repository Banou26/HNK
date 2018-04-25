import { reactivitySymbol } from '../index.js'

export const type = Node

export default node => {
  node[reactivitySymbol] = false
  return node
}
