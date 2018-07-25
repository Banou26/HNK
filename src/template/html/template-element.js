import createTemplate from './template.js'
export const OzHTMLTemplateSymbol = Symbol.for('OzHTMLTemplate')

class OzHTMLTemplate extends HTMLElement {
  constructor ({templateId, html, values, placeholders}) {
    super()
    this.templateId = templateId
    this.html = html
    this.values = values
    this.placeholders = placeholders
    this.template = undefined
  }

  static get [OzHTMLTemplateSymbol] () { return true }

  createElements () {
    this.template = createTemplate({templateId: this.templateId, html: this.html, values: this.values, placeholders: this.placeholders})
  }

  append () {

  }

  remove () {

  }

  clone (values) { return new OzHTMLTemplate(this.html, values) }

  connectedCallback () {

  }

  disconnectedCallback () {

  }
}

customElements.define('oz-html-template', OzHTMLTemplate)

export default html => new OzHTMLTemplate(html)
