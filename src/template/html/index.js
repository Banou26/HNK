import { placeholder } from '../utils.js'
import parse from './parser.js'
import createTemplate, { OzHTMLTemplate, OzHTMLTemplateSymbol } from './elements/template.js'

export {
  OzHTMLTemplate,
  OzHTMLTemplateSymbol
}

const templates = new Map()

export const tag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (templates.has(templateId)) return templates.get(templateId).clone(values)
  const { fragment, placeholdersMetadata } = parse({ transform, strings, values })
  templates.set(templateId, createTemplate({templateId, originalFragment: fragment, values, placeholdersMetadata}))
  return templates.get(templateId).clone(values)
}

export const html = tag()
