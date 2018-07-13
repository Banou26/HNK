import { isHTMLTemplate } from '../template/html/index.js'
import { isCSSTemplate } from '../template/css/index.js'
import { r, watch } from '../reactivity/index.js'
import {
  pushContext,
  elementContext,
  globalMixins,
  getMixinProp,
  noHTMLTemplateError,
  htmlTemplateChangedError,
  noCSSTemplateError,
  cssTemplateChangedError
} from './utils.js'

export const registerElement = element => {
  const {
    name,
    mixins: elementMixins,
    extends: extend,
    shadowDom: elementShadowDom,
    state: _state,
    props: elementProps = [],
    methods,
    watchers: elementWatchers = [],
    template: buildHTMLTemplate,
    style: buildCSSTemplate,
    created,
    connected,
    disconnected,
    ...rest
  } = element
  const mixins = globalMixins.concat(elementMixins)
  const props = elementProps.concat(getMixinProp(mixins, 'props')).flat(1)
  const watchers = elementWatchers.concat(getMixinProp(mixins, 'watchers').flat(1))
  const shadowDom = 'shadowDom' in element ? elementShadowDom : getMixinProp(mixins, 'shadowDom').pop()
  const createdMixins = getMixinProp(mixins, 'created')
  const connectedMixins = getMixinProp(mixins, 'connected')
  const disconnectedMixins = getMixinProp(mixins, 'disconnected')
  const Class = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement
  class OzElement extends Class {
    constructor () {
      super()
      const shadowDomType = typeof shadowDom
      const host = shadowDomType === 'string'
        ? this.attachShadow({ mode: shadowDom })
        : shadowDomType === 'boolean'
          ? this.attachShadow({ mode: shadowDom ? 'open' : 'closed' })
          : this
      const context = this[elementContext] = r({
        ...rest,
        host,
        props: {},
        methods: {},
        template: undefined,
        style: undefined
      })
      Object.defineProperties(this, props.map(prop => ({
        enumerable: true,
        writable: true,
        configurable: true,
        get: _ => context.props[prop],
        set: val => (context.props[prop] = val)
      })))
      context.state = r(typeof _state === 'function' ? _state(context) : _state || {})
      if (buildHTMLTemplate) {
        const template = context.template = buildHTMLTemplate()
        if (!template[isHTMLTemplate]) throw noHTMLTemplateError
        template.prepare()
        watch(_ => pushContext(context, buildHTMLTemplate), updatedTemplate => {
          if (template.id !== updatedTemplate.id) throw htmlTemplateChangedError
          template.update(...updatedTemplate.values)
        })
      }
      if (buildCSSTemplate) {
        const template = context.style = buildCSSTemplate()
        if (!template[isCSSTemplate]) throw noCSSTemplateError
        watch(buildCSSTemplate, updatedTemplate => {
          if (template.id !== updatedTemplate.id) throw cssTemplateChangedError
          template.update(...updatedTemplate.values)
        })
      }
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(undefined, context), item[1].bind(undefined, context))
        else watch(item.bind(undefined, context))
      }
      createdMixins.forEach(mixin => mixin(context))
      if (created) created(context)
    }

    static get name () { return name }
    static get observedAttributes () { return props }

    attributeChangedCallback (attr, oldValue, newValue) {
      if (props.includes(attr)) this[attr] = newValue
    }

    connectedCallback () {
      const { [elementContext]: context, [elementContext]: { host, style, template } } = this
      if (template) pushContext(context, _ => host.appendChild(template))
      if (style) {
        if (shadowDom) host.appendChild(style)
        else {
          const root = host.getRootNode()
          if (root === document) host.getRootNode({composed: true}).head.appendChild(style)
          else root.appendChild(style)
        }
        style.update()
      }
      connectedMixins.forEach(mixin => mixin(context))
      if (connected) connected(context)
    }

    disconnectedCallback () {
      const { [elementContext]: context, [elementContext]: { style } } = this
      if (style && !shadowDom) style.parentElement.removeChild(style) // todo: check why the element is emptied but not removed
      disconnectedMixins.forEach(mixin => mixin(context))
      if (disconnected) disconnected(context)
    }
  }
  customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined })
  return OzElement
}
