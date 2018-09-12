import { placeholder } from '../utils.js'
import parse from './parser.js'
import { createTemplate, OzHTMLTemplate, OzHTMLTemplateSymbol } from './elements/index.js'

export {
  OzHTMLTemplate,
  OzHTMLTemplateSymbol
}

const styles = new Map()

export const HTMLTag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (styles.has(templateId)) return styles.get(templateId).clone(values)
  const { fragment, placeholdersMetadata } = parse({ transform, strings, values })
  styles.set(templateId, createTemplate({ templateId, originalFragment: fragment, values, placeholdersMetadata }))
  return styles.get(templateId).clone(values)
}

export const html = HTMLTag()
