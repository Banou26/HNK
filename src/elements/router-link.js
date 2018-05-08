import { registerElement } from './element.js'
import { css } from '../template/css.js'

export default registerElement({
  name: 'router-link',
  style: _ => css`router-link { cursor: pointer; }`
})
