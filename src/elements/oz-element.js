import { html, css } from '../template-literal-tags/index.js'
import { reactify } from '../reactivity/index.js'

export const OzElementClass = _class => class OzElement extends _class {
  constructor (options) {
    super()
    this.options = options
    this.state = null
    this.__stateWatchers__ = []
    // this.store = null
    // this.router = null
    this.refs = {}
  }

  set options (options) {
    this._options = options
  }

  get options () {
    return this._options
  }

  set state (state) {
    this._state = state
  }

  get state () {
    return this._state
  }

  set __stateWatchers__ (__stateWatchers__) {
    this.___stateWatchers__ = __stateWatchers__
  }

  get __stateWatchers__ () {
    return this.___stateWatchers__
  }

  set store (store) {
    this._store = store
  }

  get store () {
    return this._store
  }

  set router (router) {
    this._router = router
  }

  get router () {
    return this._router
  }

  set refs (refs) {
    this._refs = refs
  }

  get refs () {
    return this._refs
  }

  beforeRouteUpdate () {}

  routeUpdated () {}

  beforeUpdate () {}

  updated () {}

  setState (state) {
    for (let i in this.__stateWatchers__) this.__stateWatchers__[i]()
    this.__stateWatchers__ = []
    const hostElement = this.options && this.options.shadowDom && !this.shadowRoot ? this.attachShadow({mode: this.options.shadowDom}) : this
    this.state = reactify(state)
    if ('template' in this.constructor) {
      let childs, _template
      const render = newTemplate => {
        this.beforeUpdate('template')
        if (childs) {
          for (let i in childs) {
            hostElement.removeChild(childs[i])
          }
        }
        if (newTemplate instanceof Node && newTemplate.parentNode == null) childs = [...newTemplate.body.childNodes]
        else if (newTemplate instanceof Node) childs = [...newTemplate]
        else if (typeof newTemplate === 'string') childs = [...html`${newTemplate}`.body.childNodes]
        else throw new Error('OzElement template type is invalid, accept document, node, string')
        const initOzElement = elem => {
          const storePropDesc = Object.getOwnPropertyDescriptor(elem, 'store')
          const routerPropDesc = Object.getOwnPropertyDescriptor(elem, 'router')
          if (this.store && (!storePropDesc || storePropDesc.writable)) elem.store = this.store
          if (this.router && (!routerPropDesc || routerPropDesc.writable)) elem.router = this.router
        }
        const refs = this.refs = {}
        const testElem = elem => {
          if (!(elem instanceof HTMLElement)) return
          if (elem instanceof OzElement) initOzElement(elem)
          if (elem.hasAttribute('ref')) {
            const attr = elem.getAttribute('ref')
            const refsAttr = refs[attr]
            if (refsAttr) {
              refs[attr] = [refsAttr]
              refs[attr].push(elem)
            } else refs[attr] = elem
            elem.removeAttribute('ref')
          }
          const _childs = [...elem.childNodes]
          for (let i in _childs) {
            const _elem = _childs[i]
            if (_elem instanceof OzElement) initOzElement(_elem)
            testElem(_elem)
          }
        }
        for (let i in childs) {
          const child = childs[i]
          const elem = document.importNode(child, true) // import the nodes to create them (custom components are only constructed in the window document)
          testElem(elem) // todo: testing elements after importing them register refs that aren't rendered in this OzElement template (from a custom component child)
          hostElement.appendChild(elem)
        }
        this.updated('template')
      }
      this.__stateWatchers__.push(this.state.$watch(_ => {
        return (_template = Reflect.get(this.constructor, 'template', this))
      }, newTemplate => {
        render(newTemplate)
      }))
      render(_template)
    }
    if ('style' in this.constructor) {
      let _elem, _style
      const render = newStyle => {
        this.beforeUpdate('style')
        if (_elem) hostElement.removeChild(_elem)
        hostElement.appendChild((_elem = newStyle instanceof Node ? newStyle : css`${newStyle}`))
        this.updated('style')
      }
      this.__stateWatchers__.push(this.state.$watch(_ => {
        return (_style = Reflect.get(this.constructor, 'style', this))
      }, newStyle => {
        render(newStyle)
      }))
      render(_style)
    }
  }

  connectedCallback () {
    if (!this.state) this.setState(this.constructor && this.constructor.state ? this.constructor.state() : {})
  }
}

export const OzElement = OzElementClass(HTMLElement)
