import createTemplate from './template.js'
export const OzHTMLTemplateSymbol = Symbol.for('OzHTMLTemplate')

export class OzHTMLTemplate extends Comment {
  constructor ({templateId, html, values, placeholders}) {
    super('OzHTMLTemplate')
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

  clone (values) { return new OzHTMLTemplate({html: this.html, values, placeholders: this.placeholders, templateId: this.templateId}) }

  connectedCallback () {

  }

  disconnectedCallback () {

  }
}

customElements.define('oz-html-template', OzHTMLTemplate)

export default options => new OzHTMLTemplate(options)
