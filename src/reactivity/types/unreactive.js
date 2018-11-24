import { setReactivity } from '../utils.js'

export default [
  RegExp,
  URL,
  Promise,
  window.Node,
  window.Location
].map(type => ({
  type,
  default: obj => setReactivity({target: obj, unreactive: true})
}))
