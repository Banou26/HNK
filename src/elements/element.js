import { reactify, watch } from '../reactivity/index.js'

export const ElementClass = (_class = HTMLElement) => class OzElement extends _class {
  constructor (options = {}) {
    super()
    const cstr = this.constructor
    const hasTemplate = cstr.hasOwnProperty('template')
    const hasStyle = cstr.hasOwnProperty('hasStyle')
    this.__host__ = options.shadowDom || (hasTemplate && hasStyle) ? this.attachShadow({mode: options.shadowDom}) : this
    if (this.state) this.state = reactify(this.state())
    if (hasTemplate) {
      const template = this.__template__ = cstr.template.apply(this, [this.state, this.store])()
      watch(_ => cstr.template.apply(this, [this.state, this.store]), templateBuild => template.update(...templateBuild.values))
    }
  }

  connectedCallback () {
    if (this.__template__) this.__host__.appendChild(this.__template__.content)
  }
}
export const Element = ElementClass()
