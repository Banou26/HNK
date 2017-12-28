import { reactify, watch } from '../reactivity/index.js'
import { isBuild } from '../template/utils.js'

const injectRouter = (elem, router) => {
  const walker = document.createTreeWalker(elem.shadowRoot || elem, NodeFilter.SHOW_ELEMENT, { acceptNode: node => {
    if (node instanceof Element) return NodeFilter.FILTER_ACCEPT
    else return NodeFilter.FILTER_REJECT
  } }, false)
  while (walker.nextNode()) {
    walker.currentNode.router = router
  }
}

export const ElementClass = (_class = HTMLElement) => class OzElement extends _class {
  constructor (options = {}) {
    super()
    if (options.store) this.store = options.store
    if (options.router) this.router = options.router
    const cstr = this.constructor
    const hasTemplate = cstr.hasOwnProperty('template')
    const hasStyle = cstr.hasOwnProperty('style')
    const { shadowDom } = options
    if (typeof shadowDom === 'string') this.__host__ = this.attachShadow({ mode: shadowDom })
    else this.__host__ = this
    if (this.state) this.state = reactify(this.state())
    if (hasTemplate) {
      const templateReturn = cstr.template.apply(this, [this.state, this.store])
      if (!isBuild(templateReturn)) throw new Error('Template should return a html-template build.')
      const template = this.__template__ = templateReturn()
      watch(_ => cstr.template.apply(this, [this.state, this.store]), templateBuild => {
        template.update(...templateBuild.values)
        if (this.router) injectRouter(this, this.router)
      })
      if (this.router) injectRouter(this, this.router)
    }
    if (hasStyle) {
      const style = this.__style__ = cstr.style.apply(this, [this.state, this.store])()
      watch(_ => cstr.style.apply(this, [this.state, this.store]), styleBuild => style.update(...styleBuild.values))
    }
  }

  set router (router) {
    this._router = router
    injectRouter(this, this.router)
  }
  get router () {
    return this._router
  }

  connectedCallback () {
    if (this.__template__) {
      this.__host__.appendChild(this.__template__.content)
      if (this.router) injectRouter(this, this.router)
    }
    if (this.__style__) {
      this.__host__.appendChild(this.__style__.content)
      this.__style__.update()
    }
  }
}
export const Element = ElementClass()
