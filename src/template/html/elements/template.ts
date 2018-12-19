import { r } from '../../../reactivity/index'
import { placeholdersMetadataToPlaceholders, replaceNodes, OzHTMLReference } from '../utils'
import { OzHTMLTemplate as OzHTMLTemplateSymbol } from './utils'
class OzHTMLTemplate extends HTMLTemplateElement {
  constructor ({ templateId, originalFragment, values, placeholdersMetadata, references }) {
    super()
    this.references = references || r(new Map())
    this.templateId = templateId
    this.values = values
    this.placeholdersMetadata = placeholdersMetadata
    this.originalFragment = originalFragment
    this.setAttribute('is', 'oz-html-template')
  }

  get [OzHTMLTemplateSymbol] () { return true }

  init (isUpdate) {
    if (this.placeholders) return

    const fragment = document.importNode(this.originalFragment, true)
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
    for (const value of values) {
      if (value?.[OzHTMLTemplateSymbol]) value.references = this.references
    }
    const oldArrayFragments = this.placeholders.map(({arrayFragment}) => arrayFragment.flat(Infinity))
    const referencesPlaceholders =
      this.placeholders
        .filter(placeholder => placeholder.metadata.ids.length === 1)
        .filter(({metadata: {values}}) => !values[1] && !values[2] && !values[3])
        .filter(placeholder => values[placeholder.metadata.ids[0]]?.[OzHTMLReference])
    const otherPlaceholders =
      this.placeholders.filter(placeholder => !referencesPlaceholders.includes(placeholder))
    for (const placeholder of referencesPlaceholders) placeholder({ values, forceUpdate: this.forceUpdate })
    for (const placeholder of otherPlaceholders) placeholder({ values, forceUpdate: this.forceUpdate })
    const newArrayFragments = this.placeholders.map(({arrayFragment}) => arrayFragment.flat(Infinity))
    for (const i in this.placeholders) replaceNodes(oldArrayFragments[i], newArrayFragments[i])
    this.values = values
    this.forceUpdate = false
  }

  get childNodes () {
    this.init()
    return this._childNodes
  }

  get content () {
    this.init()
    return super.content
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

customElements.get('oz-html-template') || customElements.define('oz-html-template', OzHTMLTemplate, { extends: 'template' })

export default options => new OzHTMLTemplate(options)
