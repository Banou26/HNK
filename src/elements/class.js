import { html, elementConetext } from './element.js'

export const Element = (Element = HTMLElement) => class ReactiveElement extends Element {
  constructor ({ props, scoped, shadowDom } = {}) {
    super()
    Object.defineProperty(this, elementConetext, { value: {
      state: {}
    }})
  }

  render () {
    return html``
  }

  attributeChangedCallback () {

  }

  connectedCallback () {

  }

  disconnectedCallback () {

  }
}

export const registerElement = Element => {
  
}
