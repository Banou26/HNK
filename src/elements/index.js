import { OzHTMLTemplate } from '../template/html/index.js'
import { OzStyle } from '../template/css/index.js'
import { r, watch } from '../reactivity/index.js'
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
import { getPropertyDescriptor } from '../utils.js'

export {
  OzElementContext,
  OzElementSymbol as OzElement,
  mixin
}

const globalRemovedIds = []
const globalIds = []

const makeUniqueId = (
  n = globalRemovedIds.length
    ? globalRemovedIds.shift()
    : (globalIds[globalIds.length - 1] === undefined ? 0 : globalIds.length)
) => {
  globalIds.splice(n, 0, n)
  return {
    id: n,
    unregister: _ => {
      globalRemovedIds.push(n)
      globalIds.splice(globalIds.indexOf(n), 1)
    }
  }
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
    beforeConnected,
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
  const beforeConnectedMixins = getMixinProp(mixins, 'beforeConnected')
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
        dataset: {},
        template: undefined,
        style: undefined,
        get refs () { return (this.template?.refs && Array.from(this.template?.refs).reduce((obj, [attr, val]) => ((obj[attr] = val), obj), {})) || {} },
        get references () { return this.template?.refs }
      })
      /* FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL */
      Object.defineProperties(context, Object.getOwnPropertyDescriptors({
        get refs () { return this.template?.refs && Array.from(this.template?.refs).reduce((obj, [attr, val]) => ((obj[attr] = val), obj), {}) || {} },
        get references () { return this.template?.refs }
      }))
      /*/ FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL /*/
      Object.entries(rest) // binding functions with the context
        .filter(([, value]) => typeof value === 'function')
        .forEach(([k, v]) => void (context[k] = v.bind(context, context)))
      // Props mixins & props
      let ignoreContextProps = false
      let ignoreElementProps = false
      const propsValues = r({})
      props.forEach((prop) => (propsValues[prop] = this[prop]))
      const oldDescriptors = new Map(props.map(prop => [prop, getPropertyDescriptor(this, prop)]))
      const propsDescriptors = props.reduce((props, prop) => ((props[prop] = {
        enumerable: true,
        configurable: true,
        get: _ => propsValues[prop],
        set: val => {
          if (!ignoreContextProps) {
            ignoreContextProps = true
            propsValues[prop] = val
            ignoreContextProps = false
          }
          if (!ignoreElementProps) {
            ignoreElementProps = true
            this[prop] = val
            oldDescriptors.get(prop)?.set.call(this, val)
            ignoreElementProps = false
          }
        }
      }), props), {})
      Object.defineProperties(context.props, propsDescriptors)
      Object.defineProperties(this, propsDescriptors)
      // State mixins & state
      const state = context.state = r((typeof _state === 'function' ? _state.bind(context)(context) : _state) || {})
      states
        .reverse()
        .forEach(stateMixin =>
          Object.defineProperties(state, Object.getOwnPropertyDescriptors(stateMixin(context))))
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
      if (attr.match(/-\w/)) this[OzElementContext].dataset[attr.slice(5).replace(/-\w/g, (m) => m[1].toUpperCase())] = newValue
      if (props.includes(attr)) this[attr] = newValue
    }

    connectedCallback () {
      const { [OzElementContext]: context, [OzElementContext]: { _templateWatcher, _styleWatcher } } = this
      // Connected mixins & connected
      beforeConnectedMixins.forEach(mixin => mixin(context))
      if (beforeConnected) beforeConnected(context)
      // HTML Template
      if (!_templateWatcher && (buildHTMLTemplate || templateMixins.length)) {
        const _template = buildHTMLTemplate || templateMixins[0]
        let template
        // eslint-disable-next-line no-return-assign
        context._templateWatcher = watch(_ =>
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
      if (!_styleWatcher && (buildCSSTemplate || styleMixins.length)) {
        const _style = buildCSSTemplate || styleMixins[0]
        let template
        // eslint-disable-next-line no-return-assign
        context._styleWatcher = watch(_ =>
          template
            ? _style.call(context, context)
            : (template = context.style = _style.call(context, context)),
        updatedTemplate => {
          if (!updatedTemplate[OzStyle]) throw noOzStyleError
          if (template.templateId !== updatedTemplate.templateId) throw ozStyleChangedError
          template.update(...updatedTemplate.values)
        })
      }

      const { host, style, template } = context

      if (style) {
        if (style.scoped) {
          const uniqueId = makeUniqueId()
          style.scope = uniqueId.id
          context.scope = uniqueId.id
          context._scope = uniqueId
          this.dataset.ozScope = uniqueId.id
        }
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
      if (template) host.appendChild(template.content)
    }

    disconnectedCallback () {
      const { [OzElementContext]: context, [OzElementContext]: { style } } = this
      if (style && !shadowDom) style.remove()
      if (context.scope) {
        style.scope = ''
        context._scope.unregister()
        context.scope = undefined
        context._scope = undefined
        this.dataset.ozScope = undefined
      }
      // Disconnected mixins & disconnected
      disconnectedMixins.forEach(mixin => mixin(context))
      if (disconnected) disconnected(context)
    }
  }
  window.customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined })
  return OzElement
}
