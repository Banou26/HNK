import { placeholdersMetadataToPlaceholders, replaceRules } from '../utils'
import { replace } from '../../utils'
import { OzStyle as OzStyleSymbol } from './utils'

export class OzStyle extends HTMLStyleElement {
  constructor ({ templateId, css, values, ast, placeholdersMetadata, scoped }) {
    super()
    this.ast = ast
    this.templateId = templateId
    this.values = values
    this.placeholdersMetadata = placeholdersMetadata
    this.css = css
    this.setAttribute('is', 'oz-style')
    this.scoped = scoped
    this.scope = ''
  }

  get [OzStyleSymbol] () { return true }

  set scope (scope) {
    this._scope = scope
    this.update(...this.values)
  }

  get scope () {
    return this._scope
  }

  clone (values = this.values) {
    return new OzStyle({
      ast: this.ast,
      css: this.css,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId,
      scoped: this.scoped
    })
  }

  update (...values) {
    if (!this.placeholders) return void (this.values = values)
    this.placeholders.forEach(placeholder =>
      (Array.isArray(placeholder)
        ? placeholder[0]
        : placeholder)({ values, forceUpdate: this.forceUpdate, scope: this.scope }))
    this.values = values
  }
  // TODO @banou26: check if childRules array are necessary for the style templates
  connectedCallback (ast, childRules) {
    if (childRules) replace(childRules, ...replaceRules(ast, childRules, this.ast.rules))
    else if (this.innerHTML !== this.css) this.innerHTML = this.css
    const { placeholders } = placeholdersMetadataToPlaceholders({
      element: this,
      placeholdersMetadata: this.placeholdersMetadata,
      childRules
    })
    this.childRules = childRules
    this.placeholders = placeholders

    this.forceUpdate = true
    this.update(...this.values)
    this.forceUpdate = false
    return childRules
  }

  disconnectedCallback () {
    this.placeholders
      .filter(Array.isArray)
      .forEach(([, unregister]) => unregister())
  }
}

customElements.get('oz-style') || customElements.define('oz-style', OzStyle, { extends: 'style' })

export default options => new OzStyle(options)
