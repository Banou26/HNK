import { Element } from './element.js'
import { html } from '../template/html.js'
import { css } from '../template/css.js'

export class RouterLink extends Element {
  constructor (href, router) {
    super({ shadowDom: 'open' })
    this.router = router
    this.href = href
    this.addEventListener('click', ev => {
      if (!this.router) throw new Error('No router defined for this router-link')
      this.router.push(this.href)
    })
  }

  static get observedAttributes () { return ['href'] }

  attributeChangedCallback (attr, oldValue, newValue) {
    if (attr === 'href') this.href = newValue
  }

  static template () {
    return html`<slot></slot>`
  }

  static style () {
    return css`
    :host {
      cursor: pointer;
    }
    `
  }

  set href (href) {
    this._href = href
  }

  get href () {
    return this._href
  }
}
