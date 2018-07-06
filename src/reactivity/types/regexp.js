import { setObjectReactivity } from '../utils.js'

export const type = RegExp

export default regexp => setObjectReactivity({target: regexp, unreactive: true}) || regexp
