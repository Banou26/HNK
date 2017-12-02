import { ElementClass } from './element.js'

export class RouterLink extends ElementClass(HTMLAnchorElement) {
  constructor () {
    super()
  }

  static template () {
    return this.router
  }
}
