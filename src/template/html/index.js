import { placeholder } from '../utils.js'
import parse from './parser.js'
import { createTemplate, OzHTMLTemplate } from './elements/index.js'

export {
  OzHTMLTemplate
}

const elements = new Map()

export const HTMLTag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (elements.has(templateId)) return elements.get(templateId).clone(values)
  const { fragment, placeholdersMetadata } = parse({ transform, strings, values })
  elements.set(templateId, createTemplate({ templateId, originalFragment: fragment, values, placeholdersMetadata }))
  return elements.get(templateId).clone(values)
}

export const html = HTMLTag()
