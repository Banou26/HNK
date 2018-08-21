import { setReactivity } from '../utils.js'

export const type = RegExp

export default regexp => setReactivity({target: regexp, unreactive: true}) || regexp
