import { placeholdersMetadataToPlaceholders, replaceNodes } from '../utils.js'
export const OzHTMLTemplateSymbol = Symbol.for('OzHTMLTemplate')

export class OzHTMLTemplate extends HTMLTemplateElement {
  constructor ({ templateId, originalFragment, values, placeholdersMetadata }) {
    super()

    this.templateId = templateId
    this.values = values
    this.placeholdersMetadata = placeholdersMetadata
    this.originalFragment = originalFragment
    this.setAttribute('is', 'oz-html-template')
  }

  get [OzHTMLTemplateSymbol] () { return true }

  init (isUpdate) {
    if (this.placeholders) return

    const fragment = this.originalFragment.cloneNode(true)
    const { placeholders, childNodes } = placeholdersMetadataToPlaceholders({
      template: this,
      placeholdersMetadata: this.placeholdersMetadata,
      fragment
    })

    this.placeholders = placeholders
    this.content.appendChild(fragment)
    this._childNodes = childNodes

    if (isUpdate) this.forceUpdate = true
    else this.update(...this.values)
  }

  clone (values = this.values) {
    return new OzHTMLTemplate({
      originalFragment: this.originalFragment,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId
    })
  }

  update (...values) {
    this.init(true)
    const oldArrayFragments = this.placeholders.map(({arrayFragment}) => arrayFragment.flat(Infinity))
    for (const placeholder of this.placeholders) placeholder({ values, forceUpdate: this.forceUpdate })
    const newArrayFragments = this.placeholders.map(({arrayFragment}) => arrayFragment.flat(Infinity))
    for (const i in this.placeholders) replaceNodes(oldArrayFragments[i], newArrayFragments[i])
    this.values = values
    this.forceUpdate = false
  }

  get childNodes () {
    this.init()
    return this._childNodes
  }

  connectedCallback () {
    this.insertAfter()
  }

  insertNodesAfter () {
    this.init()
    for (const node of this.childNodes.flat(Infinity)) this.parentNode.insertBefore(node, this.nextSibling)
  }

  insertNodesToFragment () {
    this.init()
    for (const node of this.childNodes.flat(Infinity)) this.content.appendChild(node)
  }

  insertAfter () {
    this.init()
    this.parentNode.insertBefore(this.content, this.nextSibling)
  }

  disconnectedCallback () {
    this.insertNodesToFragment()
  }
}

customElements.define('oz-html-template', OzHTMLTemplate, { extends: 'template' })

export default options => new OzHTMLTemplate(options)
