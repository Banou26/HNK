import { OzHTMLTemplate } from '../template/html/index'
import { OzStyle } from '../template/css/index'
import { r, watch } from '../reactivity/index'
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
} from './utils'

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

const arrayToObjectWithProperties = obj =>
  (Array.isArray(obj)
    ? obj.reduce((obj, prop) => ((obj[prop] = undefined), obj), {})
    : obj) ||
  {}

export const registerElement = element => {
  const {
    name,
    mixins: elementMixins,
    shadowDom: elementShadowDom,
    state: _state,
    attrs: _attrs,
    events: _events,
    props: _props,
    watchers: elementWatchers = [],
    template: buildHTMLTemplate,
    style: buildCSSTemplate,
    beforeConnected,
    created,
    connected,
    disconnected,
    ...rest
  } = element
  let { extends: extend } = element
  const mixins = globalMixins.concat(elementMixins || [])
  const extendsMixins = getMixinProp(mixins, 'extends').flat()
  const eventsMixins = getMixinProp(mixins, 'events').flat()
  const attrsMixins = getMixinProp(mixins, 'attrs').flat()
  const propsMixins = getMixinProp(mixins, 'props').flat()
  const states = getMixinProp(mixins, 'state').flat()
  const watchers = elementWatchers.concat(getMixinProp(mixins, 'watchers').flat())
  const shadowDom = 'shadowDom' in element ? elementShadowDom : getMixinProp(mixins, 'shadowDom').pop()
  const createdMixins = getMixinProp(mixins, 'created')
  const beforeConnectedMixins = getMixinProp(mixins, 'beforeConnected')
  const connectedMixins = getMixinProp(mixins, 'connected')
  const disconnectedMixins = getMixinProp(mixins, 'disconnected')
  const templateMixins = getMixinProp(mixins, 'template')
  const styleMixins = getMixinProp(mixins, 'style')
  if (!extend) extend = extendsMixins[0]
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
        dataset: {},
        template: undefined,
        style: undefined,
        references: new Map(),
        get refs () {
          return (this.references &&
            Array.from(this.references)
              .reduce((obj, [attr, val]) =>
                ((obj[attr] = val), obj), {})) ||
            {}
        }
      })
      /* FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL */
      Object.defineProperties(context, Object.getOwnPropertyDescriptors({
        get refs () {
          return (this.references &&
            Array.from(this.references)
              .reduce((obj, [attr, val]) =>
                ((obj[attr] = val), obj), {})) ||
            {}
        }
      }))
      /* / FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL / */
      // attributes shouldn't be appended to the element at construction time(isn't an expected behavior)
      // so think about doing it at connection time
      // // Attrs mixins & attrs
      // attrsMixins
      //   .concat([_attrs])
      //   .map(attrs =>
      //     typeof attrs === 'function'
      //       ? Object.entries(attrs(context))
      //       : Object.entries(attrs))
      //   .map(attrs =>
      //     arrayToObjectWithProperties(attrs))
      //   .map(attrs =>
      //     Object.entries(attrs))
      //   .forEach(([name, value]) =>
      //     this.setAttribute(name, value))
      const attrs = context.attrs = r({})
      let ignoreAttrsObserver = false
      for (const {name, value} of this.attributes) attrs[name] = value
      const attributeObserver = context._attributeObserver = new MutationObserver(records =>
        records
          .forEach(({attributeName}) => {
            if (!ignoreAttrsObserver && this.hasAttribute(attributeName)) {
              ignoreAttrsObserver = true
              attrs[attributeName] = this.getAttribute(attributeName)
              ignoreAttrsObserver = false
            }
          }))
      attributeObserver.observe(this, { attributes: true })
      attrs.$watch(({event: { property, value }}) => {
        this.setAttribute(property, value)
        attributeObserver.takeRecords()
      })
      // Props mixins & props
      const setProps = []
      const setProp = prop => {
        if (setProps.includes(prop)) return
        setProps.push(prop)
        Object.defineProperty(this, prop, {
          enumerable: true,
          configurable: true,
          get: _ => context.props[prop],
          set: val => (context.props[prop] = val)
        })
      }
      const props = context.props = new Proxy(r({}), {
        get: (target, property, receiver) => {
          if (property in target) return Reflect.get(target, property, receiver)
          else {
            target[property] = this[property]
            setProp(property)
            return Reflect.get(target, property, receiver)
          }
        },
        defineProperty (target, property, desc) {
          setProp(property)
          return Reflect.defineProperty(target, property, desc)
        }
      })
      propsMixins
        .concat(_props || [])
        .forEach(_props =>
          Object.defineProperties(
            props,
            Object.getOwnPropertyDescriptors(
              arrayToObjectWithProperties(
                typeof _props === 'function'
                  ? _props(context)
                  : _props))))
      // State mixins & state
      const state = context.state = r((typeof _state === 'function' ? _state.bind(context)(context) : _state) || {})
      states
        .forEach(stateMixin =>
          Object.defineProperties(
            state,
            Object.getOwnPropertyDescriptors(
              stateMixin(context))))
      // Watchers mixins & watchers
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(context, context), item[1].bind(context, context))
        else watch(item.bind(context, context))
      }
      // Events mixins & events
      eventsMixins
        .concat(_events || [])
        .map(events =>
          typeof events === 'function'
            ? events(context)
            : events)
        .map(events =>
          Object.entries(events))
        .flat()
        .forEach(([name, event]) =>
          this.addEventListener(name, event))
      // binding functions to the context
      Object.entries(rest)
        .filter(([, value]) => typeof value === 'function')
        .forEach(([k, v]) => void (context[k] = v.bind(context, context)))
      // Created mixins & created
      createdMixins
        .concat(created || [])
        .forEach(created => created(context))
    }

    get [OzElementSymbol] () { return true }
    static get name () { return name }

    connectedCallback () {
      const { [OzElementContext]: context, [OzElementContext]: { host, _templateWatcher, _styleWatcher, references } } = this
      // Connected mixins & connected
      beforeConnectedMixins.forEach(mixin => mixin(context))
      if (beforeConnected) beforeConnected(context)
      let { style, template } = context
      // CSS Template
      if (!_styleWatcher && (buildCSSTemplate || styleMixins.length)) {
        const _style = buildCSSTemplate || styleMixins[0]
        // eslint-disable-next-line no-return-assign
        context._styleWatcher = watch(_ =>
          style
            ? _style.call(context, context)
            : (style = context.style = _style.call(context, context)),
        ({newValue: updatedTemplate}) => {
          if (!updatedTemplate[OzStyle]) throw noOzStyleError
          if (style.templateId !== updatedTemplate.templateId) throw ozStyleChangedError
          style.update(...updatedTemplate.values)
        })
      }
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
      }
      // HTML Template
      if (!_templateWatcher && (buildHTMLTemplate || templateMixins.length)) {
        const _template = buildHTMLTemplate || templateMixins[0]
        template = context.template = _template.call(context, context)
        template.references = references
        host.appendChild(template.content)
        context._templateWatcher = watch(
          _ => _template.call(context, context),
          ({newValue: updatedTemplate}) => {
            if (!updatedTemplate[OzHTMLTemplate]) throw noHTMLTemplateError
            if (template.templateId !== updatedTemplate.templateId) throw htmlTemplateChangedError
            template.update(...updatedTemplate.values)
          })
      } else if (template) host.appendChild(template.content)

      // Connected mixins & connected
      connectedMixins.forEach(mixin => mixin(context))
      if (connected) connected(context)
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
