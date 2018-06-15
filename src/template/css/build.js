import { indexPlaceholders, regex as placeholderRegex, split, placeholder as placeholderStr, mergeSplitWithPlaceholders } from './utils.js'
import parse from './parser.js'
// import createInstance from './instance.js'

const createBuild = ({id, css, placeholders: _placeholders}) => {
  const template = document.createElement('style')
  template.innerHTML = css
  const placeholders = getPlaceholderWithPaths(template.content, _placeholders)
  return values => {
    const _createInstance = createInstance.bind(undefined, { id, template, placeholders }, ...values)
    _createInstance.build = true
    _createInstance.id = id
    _createInstance.values = values
    return _createInstance
  }
}

const cache = new Map()

export const tag = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings]
  const id = 'css' + strings.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  const { css, placeholders } = parsePlaceholders({cssArray: split(transform ? transform(mergeSplitWithPlaceholders(strings)) : mergeSplitWithPlaceholders(strings)).filter((str, i) => !(i % 2)), values})
  const build = createBuild({ id, css, placeholders })
  cache.set(id, build)
  return build(values)
}
