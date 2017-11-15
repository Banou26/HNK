import { OzElement } from './oz-element.js'

export class RouterView extends OzElement {
  constructor () {
    super()
  }

  static template () {
    return this.router
  }
}
