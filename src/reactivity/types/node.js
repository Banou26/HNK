import { setReactivity } from '../index.js'

export const type = Node

export default node => setReactivity({target: node, unreactive: true}) || node
