import { placeholder } from '../utils.js'
import parse from './parser.js'
import createTemplate, { OzHTMLTemplate } from './elements/template.js'

export {
  OzHTMLTemplate
}

const templates = new Map()

export const tag = (transform = str => str) => (strings, ...values) => {
  const templateId = strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (templates.has(templateId)) return templates.get(templateId).clone(values)
  const { html, placeholders } = parse({ transform, strings, values })
  templates.set(templateId, createTemplate({templateId, html, values, placeholders}))
  return templates.get(templateId).clone(values)
}

export const html = tag()
