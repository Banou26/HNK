import { setObjectReactivity } from '../index.js'

export const type = RegExp

export default regexp => {
  setObjectReactivity({target: regexp, unreactive: true})
  return regexp
}
