import { setReactivity } from '../utils.js'

export const type = Node

export default node => setReactivity({target: node, unreactive: true}) || node
