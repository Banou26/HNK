import OzHTMLTemplate from './template-element.js'
import { placeholder } from '../utils.js'
import analyze from './analyzer.js'

const templates = new Map()

export default transform => (strings, ...values) => {
  const templateId = strings.join(placeholder())
  if (templates.has(templateId)) return templates.get(templateId).clone(values)
  const { html, placeholders } = analyze({ transform, strings, values })
  templates.set(templateId, new OzHTMLTemplate({templateId, html, values, placeholders}))
  return templates.get(templateId).clone(values)
}
