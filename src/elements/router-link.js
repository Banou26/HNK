import { registerElement } from './element.js'
import { css } from '../template/css.js'

export default registerElement({
  name: 'router-link',
  extends: HTMLAnchorElement,
  style: _ => css`router-link, a[is="router-link"] {
    cursor: pointer;
  }`
})
