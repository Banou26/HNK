import { OzHTMLTemplate } from '../template/html/index.js'
import { OzStyle } from '../template/css/index.js'
import { r, watch, isolate } from '../reactivity/index.js'
import {
  OzElementContext,
  mixins as globalMixins,
  getMixinProp,
  noHTMLTemplateError,
  htmlTemplateChangedError,
  noOzStyleError,
  ozStyleChangedError,
  OzElement as OzElementSymbol,
  mixin
} from './utils.js'

export {
  OzElementContext,
  OzElementSymbol as OzElement,
  mixin
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
  const states = getMixinProp(mixins, 'state').flat(1)
  const watchers = elementWatchers.concat(getMixinProp(mixins, 'watchers').flat(1))
  const shadowDom = 'shadowDom' in element ? elementShadowDom : getMixinProp(mixins, 'shadowDom').pop()
  const createdMixins = getMixinProp(mixins, 'created')
  const connectedMixins = getMixinProp(mixins, 'connected')
  const disconnectedMixins = getMixinProp(mixins, 'disconnected')
  const templateMixins = getMixinProp(mixins, 'template')
  const styleMixins = getMixinProp(mixins, 'style')
  const Class = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement
  class OzElement extends Class {
    // TODO: test if i need to make a helper function from the reactivity side to isolate the constructors
    // because they can register some dependencies in the parent templates dependencies
    constructor () {
      super()
      // isolate(_ => {

      // })
      const shadowDomType = typeof shadowDom
      const host = shadowDomType === 'string'
        ? this.attachShadow({ mode: shadowDom })
        : shadowDomType === 'boolean'
          ? this.attachShadow({ mode: shadowDom ? 'open' : 'closed' })
          : this
      const context = this[OzElementContext] = r({
        ...rest,
        element: this,
        host,
        props: {},
        template: undefined,
        style: undefined
      })
      Object.entries(rest) // binding functions with the context
        .filter(([, value]) => typeof value === 'function')
        .forEach(([k, v]) => void (context[k] = v.bind(context, context)))
      // Props mixins & props
      props.forEach((prop) => (context.props[prop] = this[prop]))
      Object.defineProperties(this, props.reduce((props, prop) => (props[prop] = {
        enumerable: true,
        configurable: true,
        get: _ => context.props[prop],
        set: val => (context.props[prop] = val)
      }) && props, {}))
      // State mixins & state
      const state = context.state = r((typeof _state === 'function' ? _state.bind(context)(context) : _state) || {})
      states
        .reverse()
        .forEach(stateMixin =>
          Object.defineProperties(state, Object.getOwnPropertyDescriptors(stateMixin(context))))
      // HTML Template
      if (buildHTMLTemplate || templateMixins.length) {
        const _template = buildHTMLTemplate || templateMixins[0]
        let template
        // eslint-disable-next-line no-return-assign
        watch(_ =>
          template
            ? _template.call(context, context)
            : (template = context.template = _template.call(context, context)),
        updatedTemplate => {
          if (!updatedTemplate[OzHTMLTemplate]) throw noHTMLTemplateError
          if (template.templateId !== updatedTemplate.templateId) throw htmlTemplateChangedError
          template.update(...updatedTemplate.values)
        })
      }
      // CSS Template
      if (buildCSSTemplate || styleMixins.length) {
        const _style = buildCSSTemplate || styleMixins[0]
        let template
        // eslint-disable-next-line no-return-assign
        watch(_ =>
          template
            ? _style.call(context, context)
            : (template = context.style = _style.call(context, context)),
        updatedTemplate => {
          if (!updatedTemplate[OzStyle]) throw noOzStyleError
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
      const { [OzElementContext]: context, [OzElementContext]: { host, style, template } } = this
      if (template) host.appendChild(template.content)
      if (style) {
        if (shadowDom) host.appendChild(style)
        else {
          const root = host.getRootNode()
          if (root === document) host.getRootNode({composed: true}).head.appendChild(style)
          else root.appendChild(style)
        }
        // style.update(...style.values)
      }
      // Connected mixins & connected
      connectedMixins.forEach(mixin => mixin(context))
      if (connected) connected(context)
    }

    disconnectedCallback () {
      const { [OzElementContext]: context, [OzElementContext]: { style } } = this
      if (style && !shadowDom) style.remove()
      // Disconnected mixins & disconnected
      disconnectedMixins.forEach(mixin => mixin(context))
      if (disconnected) disconnected(context)
    }
  }
  window.customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined })
  return OzElement
}
