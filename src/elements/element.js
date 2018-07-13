import registerClass from './class.js'
import registerObject from './object.js'

export default element =>
  typeof element === 'function'
    ? registerClass(element)
    : registerObject(element)
