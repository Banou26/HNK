import { Element } from './element.js'

export class RouterView extends Element {
  constructor () {
    super()
  }

  static template () {
    return this.router
  }
}
