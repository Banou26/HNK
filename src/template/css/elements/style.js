import { placeholdersMetadataToPlaceholders, replaceRules } from '../utils.js'
import { replace } from '../../utils.js'
export const OzStyleSymbol = Symbol.for('OzStyleSymbol')

export class OzStyle extends HTMLStyleElement {
  constructor ({ templateId, css, values, ast, placeholdersMetadata }) {
    super()

    this.ast = ast
    this.templateId = templateId
    this.values = values
    this.placeholdersMetadata = placeholdersMetadata

    this.css = css
    this.setAttribute('is', 'oz-style')
    this.innerHTML = css
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
    for (const placeholder of this.placeholders) placeholder({ values, forceUpdate: this.forceUpdate })
    this.values = values
  }

  connectedCallback (ast, childRules) {
    let newRules
    if (childRules) newRules = (void replace(childRules, ...replaceRules(ast, childRules, this.ast.rules))) || childRules   
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
    return newRules
  }
}

customElements.define('oz-style', OzStyle, { extends: 'style' })

export default options => new OzStyle(options)