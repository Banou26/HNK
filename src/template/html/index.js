import { placeholder } from '../utils.js'
import analyze from './analyzer.js'
import createTemplate, { OzHTMLTemplate } from './template-element.js'

export {
  OzHTMLTemplate
}

const templates = new Map()

export const tag = (transform = str => str) => (strings, ...values) => {
  const templateId = strings.join(placeholder())
  if (templates.has(templateId)) return templates.get(templateId).clone(values)
  const { html, placeholders } = analyze({ transform, strings, values })
  templates.set(templateId, createTemplate({templateId, html, values, placeholders}))
  return templates.get(templateId).clone(values)
}

export const html = tag()
