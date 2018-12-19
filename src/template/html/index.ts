import { placeholder } from '../utils'
import { OzHTMLReference, OzHTMLReferencePath } from './utils'
import parse from './parser'
import { createTemplate, OzHTMLTemplate } from './elements/index'
import { reactivity } from '../../reactivity/index'

export {
  OzHTMLTemplate
}

const elements = new Map()

export const HTMLTag = (transform = str => str) => {
  const tag = (strings, ...values) => {
    const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2)
    if (elements.has(templateId)) return elements.get(templateId).clone(values)
    const { fragment, placeholdersMetadata } = parse({ transform, strings, values })
    elements.set(templateId, createTemplate({ templateId, originalFragment: fragment, values, placeholdersMetadata }))
    return elements.get(templateId).clone(values)
  }
  tag.ref = val => ({
    [OzHTMLReference]: val
  })
  return tag
}

export const html = HTMLTag()
