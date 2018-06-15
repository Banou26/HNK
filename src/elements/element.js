import { reactify, watch } from '../reactivity/index.js'

export let elementContext = Symbol.for('OzElementContext')

const mixins = []
export const mixin = obj => mixins.push(obj)
let currentContexts = []

const callMixin = (context, options, mixin) => {
  const parentContext = currentContexts[currentContexts.length - 1]
  mixin({ context, options, ...parentContext && parentContext !== context && { parentContext: parentContext } })
}

export const pushContext = (context, func) => {
  const _currentContexts = [...currentContexts]
  currentContexts = [...currentContexts, context]
  try {
    return func()
  } finally {
    currentContexts = [..._currentContexts]
  }
}

export const registerElement = options => {
  const {
    name,
    extends: extend,
    shadowDom,
    state,
    props,
    methods,
    watchers = [],
    template: htmlTemplate,
    style: cssTemplate,
    created,
    connected,
    disconnected,
    ...rest
  } = options
  const extendsClass = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement
  class OzElement extends extendsClass {
    constructor () {
      super()
      const host = shadowDom && this.attachShadow ? this.attachShadow({ mode: shadowDom }) : this
      const context = this[elementContext] = reactify({
        ...rest,
        host,
        props: {},
        methods: {},
        template: undefined,
        style: undefined
      })
      context.state = reactify(typeof state === 'function' ? state(context) : state || {})
      if (methods) {
        for (const method in methods) context.methods[method] = methods[method].bind(undefined, context)
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
      mixins.forEach(callMixin.bind(undefined, context, options))
      if (htmlTemplate) {
        let template, build
        const buildTemplate = htmlTemplate.bind(undefined, context)
        watch(_ => pushContext(context, _ => (build = buildTemplate())), build => {
          if (template.id === build.id) template.update(...build.values)
          else {
            pushContext(context, _ => {
              template.content // eslint-disable-line
              template = build()
              context.template = template
              host.appendChild(template.content)
            })
          }
        })
        if (!build.build) throw new Error('The template function should return a html-template build.')
        pushContext(context, _ => (template = build()))
        context.template = template
      }
      if (cssTemplate) {
        let template, build
        const buildTemplate = cssTemplate.bind(undefined, context)
        watch(_ => (build = buildTemplate()), build => template.update(...build.values))
        // if (!build.build) throw new Error('The style function should return a css-template build.')
        template = build()
        context.style = template
      }
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(undefined, context), item[1].bind(undefined, context))
        else watch(item.bind(undefined, context))
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
      const { [elementContext]: context, [elementContext]: { host, style, template } } = this
      mixins.forEach(callMixin.bind(undefined, context, options))
      if (template) pushContext(context, _ => host.appendChild(template.content))
      if (style) {
        if (shadowDom) host.appendChild(style.content)
        else {
          const root = host.getRootNode()
          if (root === document) host.getRootNode({composed: true}).head.appendChild(style.content)
          else root.appendChild(style.content)
        }
        style.update()
      }
      if (connected) connected(context)
    }

    disconnectedCallback () {
      const { [elementContext]: context, [elementContext]: { style } } = this
      if (style && !shadowDom) style.content.parentElement.removeChild(style.content) // todo: check why the element is emptied but not removed
      if (disconnected) disconnected(context)
    }
  }
  customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined })
  return OzElement
}
