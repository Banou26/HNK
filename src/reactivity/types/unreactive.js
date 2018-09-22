import { setReactivity } from '../utils.js'

export default [
  RegExp,
  URL,
  window.Location
].map(type => ({
  type,
  default: obj => setReactivity({target: obj, unreactive: true}) || obj
}))
