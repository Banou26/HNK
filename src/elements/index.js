import { OzHTMLTemplateSymbol } from '../template/html/index.js'
import { OzStyleSymbol } from '../template/css/index.js'
import { r, watch } from '../reactivity/index.js'
import {
  pushContext,
  elementContext,
  mixins as globalMixins,
  getMixinProp,
  noHTMLTemplateError,
  htmlTemplateChangedError,
  noOzStyleError,
  ozStyleChangedError,
  OzElementSymbol
} from './utils.js'

export {
  OzElementSymbol
}

export const registerElement = element => {
  const {
    name,
    mixins: elementMixins,
    extends: extend,
    shadowDom: elementShadowDom,
    state: _state,
    props: elementProps = [],
    watchers: elementWatchers = [],
    template: buildHTMLTemplate,
    style: buildCSSTemplate,
    created,
    connected,
    disconnected,
    ...rest
  } = element
  const mixins = globalMixins.concat(elementMixins || [])
  const props = elementProps.concat(getMixinProp(mixins, 'props')).flat(1)
  const states = elementProps.concat(getMixinProp(mixins, 'state')).flat(1)
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
        ...Object.entries(rest) // binding functions with the context
          .filter(([, value]) => typeof value === 'function')
          .reduce((obj, [k, v]) => void (obj[k] = v.bind(context, context)) || obj, {}),
        element: this,
        host,
        props: {},
        template: undefined,
        style: undefined
      })
      // Props mixins & props
      Object.defineProperties(this, props.map(prop => ({
        enumerable: true,
        writable: true,
        configurable: true,
        get: _ => context.props[prop],
        set: val => (context.props[prop] = val)
      })))
      // State mixins & state
      const state = context.state = r(typeof _state === 'function' ? _state(context) : _state || {})
      states.reverse().forEach(stateMixin =>
        Object.entries(Object.getOwnPropertyDescriptors(stateMixin()))
          .forEach(([prop, desc]) => !(prop in state) ? undefined : Object.defineProperty(state, prop, desc)))
      // HTML Template
      if (buildHTMLTemplate) {
        const template = context.template = buildHTMLTemplate()
        if (!template[OzHTMLTemplateSymbol]) throw noHTMLTemplateError
        watch(_ => pushContext(context, buildHTMLTemplate), updatedTemplate => {
          if (template.templateId !== updatedTemplate.templateId) throw htmlTemplateChangedError
          template.update(...updatedTemplate.values)
        })
      }
      // CSS Template
      if (buildCSSTemplate) {
        const template = context.style = buildCSSTemplate()
        if (!template[OzStyleSymbol]) throw noOzStyleError
        watch(buildCSSTemplate, updatedTemplate => {
          if (template.templateId !== updatedTemplate.templateId) throw ozStyleChangedError
          template.update(...updatedTemplate.values)
        })
      }
      // Watchers mixins & watchers
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(context, context), item[1].bind(context, context))
        else watch(item.bind(context, context))
      }
      // Created mixins & created
      createdMixins.forEach(mixin => mixin(context))
      if (created) created(context)
    }

    get [OzElementSymbol] () { return true }
    static get name () { return name }
    static get observedAttributes () { return props }

    attributeChangedCallback (attr, oldValue, newValue) {
      if (props.includes(attr)) this[attr] = newValue
    }

    connectedCallback () {
      const { [elementContext]: context, [elementContext]: { host, style, template } } = this
      if (template) pushContext(context, _ => host.appendChild(template.content))
      if (style) {
        if (shadowDom) host.appendChild(style)
        else {
          const root = host.getRootNode()
          if (root === document) host.getRootNode({composed: true}).head.appendChild(style)
          else root.appendChild(style)
        }
        style.update()
      }
      // Connected mixins & connected
      connectedMixins.forEach(mixin => mixin(context))
      if (connected) connected(context)
    }

    disconnectedCallback () {
      const { [elementContext]: context, [elementContext]: { style } } = this
      if (style && !shadowDom) style.remove()
      // Disconnected mixins & disconnected
      disconnectedMixins.forEach(mixin => mixin(context))
      if (disconnected) disconnected(context)
    }
  }
  customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined })
  return OzElement
}
