import { placeholdersMetadataToPlaceholders, replaceRules } from '../utils.js'
import { replace } from '../../utils.js'
import { OzStyle as OzStyleSymbol } from './utils.js'

export class OzStyle extends HTMLStyleElement {
  constructor ({ templateId, css, values, ast, placeholdersMetadata }) {
    super()
    this.ast = ast
    this.templateId = templateId
    this.values = values
    this.placeholdersMetadata = placeholdersMetadata
    this.css = css
    this.setAttribute('is', 'oz-style')
  }

  get [OzStyleSymbol] () { return true }

  clone (values = this.values) {
    return new OzStyle({
      ast: this.ast,
      css: this.css,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId
    })
  }

  update (...values) {
    if (!this.placeholders) return void (this.values = values)
    this.placeholders.forEach(placeholder =>
      (Array.isArray(placeholder)
        ? placeholder[0]
        : placeholder)({ values, forceUpdate: this.forceUpdate }))
    this.values = values
  }

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
