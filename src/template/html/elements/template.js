import createTemplate from '../template.js'
export const OzHTMLTemplateSymbol = Symbol.for('OzHTMLTemplate')

export class OzHTMLTemplate extends Comment {
  constructor ({templateId, html, values, placeholders}) {
    super('OzHTMLTemplate')
    this.templateId = templateId
    this.html = html
    this.values = values
    this.placeholders = placeholders
    this.template = createTemplate({
      templateId: templateId,
      html: html,
      values,
      placeholders: placeholders
    })
  }

  static get [OzHTMLTemplateSymbol] () { return true }

  clone (values) {
    return new OzHTMLTemplate({
      html: this.html,
      values,
      placeholders: this.placeholders,
      templateId: this.templateId
    })
  }

  connectedCallback () {
    this.parentNode.insertBefore(this.template.content, this)
  }

  get content () {
    return this.template.content
  }

  disconnectedCallback () {
    this.content // eslint-disable-line no-unused-expressions
  }
}

customElements.define('oz-html-template', OzHTMLTemplate)

export default options => new OzHTMLTemplate(options)
