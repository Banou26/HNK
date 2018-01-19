import { reactify, watch } from '../reactivity/index.js'
import { isBuild } from '../template/utils.js'
import { hasProperty } from '../util/index.js'

const injectRouter = (elem, router) => {
  const ozElements = []
  const walker = document.createTreeWalker(elem.shadowRoot || elem, NodeFilter.SHOW_ELEMENT, { acceptNode: node => {
    if (node instanceof Element || (node.constructor.__ozElement__ && node.__context__)) {
      ozElements.push(node)
      return NodeFilter.FILTER_REJECT
    } else return NodeFilter.FILTER_SKIP
  } }, false)
  while (walker.nextNode()) {}
  for (const element of ozElements) element.$router = router
}

export const ElementClass = (_class = HTMLElement) => class OzElement extends _class {
  constructor ({store, router, shadowDom}) {
    super()
    if (store) this.$store = store
    if (router) this.$router = router
    const cstr = this.constructor
    const hasTemplate = hasProperty(cstr, 'template')
    const hasStyle = hasProperty(cstr, 'style')
    let state
    if (hasProperty(this, 'state')) state = this.$state = reactify(this.state())
    const host = this.$host = shadowDom ? this.attachShadow({ mode: shadowDom }) : this
    if (hasTemplate) {
      let templateReturn
      let template
      watch(_ => (templateReturn = cstr.template.apply(this, [{state, store}])), templateBuild => {
        template.update(...templateBuild.values)
        if (router) injectRouter(this, router)
      })
      if (!isBuild(templateReturn)) throw new Error('Template should return a html-template build.')
      template = this.$template = templateReturn()
      host.appendChild(template.content)
      if (router) injectRouter(this, router)
    }
    if (hasStyle) {
      const style = this.$style = cstr.style.apply(this, [{state, store}])()
      watch(_ => cstr.style.apply(this, [{state, store}]), styleBuild => style.update(...styleBuild.values))
      host.appendChild(this.$style.content)
      style.update()
    }
  }

  set $router (router) {
    this._$router = router
    injectRouter(this, this.$router)
  }
  get $router () {
    return this._$router
  }
}
export const Element = ElementClass()

const injectGettersContext = (ctx, obj) => {
  const descs = Object.getOwnPropertyDescriptors(obj)
  for (const prop in descs) {
    const desc = descs[prop]
    const { get, value } = desc
    if (get) {
      Object.defineProperty(obj, prop, {...desc, get: get.bind(obj, ctx)})
    } else if (value) {
      injectGettersContext(ctx, value)
    }
  }
  return obj
}

export const registerElement = ({
  name,
  extend = HTMLElement,
  options: _options = {},
  props: _props = [],
  state: _state,
  template: _template,
  style: _style,
  router: _router,
  store: _store,
  watchers: _watchers = {},
  created: _created,
  connected: _connected,
  disconnected: _disconnected,
  customElements = window.customElements
  }) => {
  _props = [..._props, '$router']
  class OzFunctionnalElement extends extend {
    constructor (cstrOptions = {}) {
      super()
      const {shadowDom, router: router_} = {..._options, ...cstrOptions}
      const context = this.__context__ = reactify({
        host: shadowDom ? this.attachShadow({ mode: shadowDom }) : this,
        props: {},
        get router () {
          return this.props.$router || router_
        },
        watchers: {},
        template: undefined,
        style: undefined
      })
      const { host, router, props, watchers } = context
      context.state = reactify(typeof _state === 'function' ? _state(context) : _state || {})
      if (props) {
        const propsDescriptors = {}
        for (const prop of _props) {
          propsDescriptors[prop] = {
            enumerable: true,
            get: _ => props[prop],
            set: val => (props[prop] = val)
          }
        }
        Object.defineProperties(this, propsDescriptors)
      }
      if (_template) {
        let template, build
        const buildTemplate = _template.bind(null, context)
        watch(_ => (build = buildTemplate(context)), build => {
          template.update(...build.values)
          if (router) injectRouter(host, router)
        })
        if (!isBuild(build)) throw new Error('Template should return a html-template build.')
        template = build()
        context.template = template
      }
      if (_style) {
        let style, build
        const buildStyle = _style.bind(null, context)
        watch(_ => (build = buildStyle()), styleBuild => style.update(...styleBuild.values))
        if (!isBuild(build)) throw new Error('Style should return a css-template build.')
        style = build()
        context.style = style
      }
      for (const [name, _watcher] of Object.entries(_watchers)) {
        watch(watchers[name] = _watcher.bind(null, context))
      }
      if (_created) _created(context)
    }

    static get __ozElement__ () { return true }
    static get name () { return name }
    static get observedAttributes () { return _props }

    attributeChangedCallback (attr, oldValue, newValue) {
      if (_props.includes(attr)) this[attr] = newValue
    }

    connectedCallback () {
      const ctx = this.__context__
      const {host, style, router, template} = ctx
      if (template) {
        host.appendChild(template.content)
        if (router) injectRouter(host, router)
      }
      if (style) {
        host.appendChild(style.content)
        style.update()
      }
      if (_connected) _connected(ctx)
    }

    disconnectedCallback () {
      const ctx = this.__context__
      if (_disconnected) _disconnected(ctx)
    }
  }
  customElements.define(name, OzFunctionnalElement)
  return OzFunctionnalElement
}
