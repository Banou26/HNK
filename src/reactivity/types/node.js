import { setObjectReactivity } from '../index.js'

export const type = Node

export default node => {
  setObjectReactivity({target: node, unreactive: true})
  return node
}
