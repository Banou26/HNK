import parse from './parser.ts'
import { fromPlaceholder } from './utils.ts'
import makeTemplate, { Element } from './template.ts'

export {
  makeTemplate as HTMLTemplate,
  Element as HTMLTemplateElement
}

const elements = new Map()

export const tag = (
  { transform = str => str, key }: { transform?: Function, key?: any } = {},
  strings: string[],
  ...values: any[]
) => {
  const templateId = 'html' + strings.reduce((str, str2, i) => str + fromPlaceholder(i - 1) + str2)

  if (elements.has(templateId)) {
    return elements.get(templateId).clone({ key, values })
  }
  
  const [ fragment, placeholdersMetadata ] = parse({ transform, strings, values })
  elements.set(templateId, makeTemplate({ templateId, originalFragment: fragment, values, placeholdersMetadata }))

  return elements.get(templateId).clone({ key, values })
}

export const html =
  (strings, ...values: any[]) =>
    strings?.raw
      ? tag(undefined, strings, ...values)
      : (_strings: string[], ...values: any[]) =>
        tag({ key: /* is key */strings }, _strings, ...values)
