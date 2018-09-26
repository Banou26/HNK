import { placeholder } from '../utils.js'
import parse from './parser.js'
import { createStyle, OzStyle } from './elements/index.js'

export {
  OzStyle
}

const styles = new Map()

export const CSSTag = (transform = str => str) => (strings, ...values) => {
  const templateId = 'css' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
  if (styles.has(templateId)) return styles.get(templateId).clone(values)
  const { ast, css, placeholdersMetadata } = parse({ transform, strings, values })
  styles.set(templateId, createStyle({ templateId, css, values, ast, placeholdersMetadata }))
  return styles.get(templateId).clone(values)
}

export const css = CSSTag()
