import { reactify, watch } from '../reactivity/index.js'

const mixins = []
export const mixin = obj => mixins.push(obj)

const currentContexts = []

export const registerElement = options => {
  const {
    name,
    extend = HTMLElement,
    shadowDom,
    state,
    props,
    methods,
    watchers = [],
    template: htmlTemplate,
    style: cssTemplate,
    created,
    connected,
    disconnected
  } = options
  class OzElement extends extend {
    constructor () {
      super()
      const context = this.__context__ = reactify({
        host: shadowDom && this.attachShadow ? this.attachShadow({ mode: shadowDom }) : this,
        props: {},
        methods: {},
        template: undefined,
        style: undefined
      })
      context.state = reactify(typeof state === 'function' ? state(context) : state || {})
      if (methods) {
        for (const method in methods) context.methods[method] = methods[method].bind(null, context)
      }
      if (props) {
        const propsDescriptors = {}
        for (const prop of props) {
          propsDescriptors[prop] = {
            enumerable: true,
            get: _ => context.props[prop],
            set: val => (context.props[prop] = val)
          }
        }
        Object.defineProperties(this, propsDescriptors)
      }
      for (const mixin of mixins) {
        const parentContext = currentContexts[currentContexts.length - 1]
        mixin({ context, ...parentContext && parentContext !== context && { parentContext: parentContext }, options })
      }
      if (htmlTemplate) {
        let template, build
        const buildTemplate = htmlTemplate.bind(null, context)
        watch(_ => {
          currentContexts.push(context)
          build = buildTemplate()
          currentContexts.splice(currentContexts.indexOf(context), 1)
          return build
        }, build => template.update(...build.values))
        if (!build.build) throw new Error('The template function should return a html-template build.')
        currentContexts.push(context)
        template = build()
        currentContexts.splice(currentContexts.indexOf(context), 1)
        context.template = template
      }
      if (cssTemplate) {
        let template, build
        const buildTemplate = cssTemplate.bind(null, context)
        watch(_ => (build = buildTemplate()), build => template.update(...build.values))
        // if (!build.build) throw new Error('The style function should return a css-template build.')
        template = build()
        context.style = template
      }
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(null, context), item[1].bind(null, context))
        else watch(item.bind(null, context))
      }
      if (created) created(context)
    }

    static get __ozElement__ () { return true }
    static get name () { return name }
    static get observedAttributes () { return props }

    attributeChangedCallback (attr, oldValue, newValue) {
      if (props.includes(attr)) this[attr] = newValue
    }

    connectedCallback () {
      const ctx = this.__context__
      const { host, style, template } = ctx
      if (template) host.appendChild(template.content)
      if (style) {
        if (shadowDom) host.appendChild(style.content)
        else this.ownerDocument.head.appendChild(style.content)
        style.update()
      }
      if (connected) connected(ctx)
    }

    disconnectedCallback () {
      const ctx = this.__context__
      const { style } = ctx
      if (style && !shadowDom) style.content.parentElement.removeChild(style.content) // todo: check why the element is emptied but not removed
      if (disconnected) disconnected(ctx)
    }
  }
  customElements.define(name, OzElement)
  return OzElement
}
