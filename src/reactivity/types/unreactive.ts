import { setReactivity } from '../utils'

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
