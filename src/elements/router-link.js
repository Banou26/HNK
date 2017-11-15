import { OzElementClass } from './oz-element.js'

export class RouterLink extends OzElementClass(HTMLAnchorElement) {
  constructor () {
    super()
  }

  static template () {
    return this.router
  }
}
