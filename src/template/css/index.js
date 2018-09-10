import { placeholder } from '../utils.js'
import parse from './parser.js'
import createTemplate, { OzStyle, OzStyleSymbol } from './elements/style.js'

export {
  OzStyle,
  OzStyleSymbol
}

const elements = new Map()

export const tag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'css' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (elements.has(templateId)) return elements.get(templateId).clone(values)
  const { ast, css, placeholdersMetadata } = parse({ transform, strings, values })
  elements.set(templateId, createTemplate({ templateId, css, values, ast, placeholdersMetadata }))
  return elements.get(templateId).clone(values)
}

export const css = tag()
