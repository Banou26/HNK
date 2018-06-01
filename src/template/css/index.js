
const createBuild = ({id, css, placeholders: _placeholders}) => {
  const style = document.createElement('style')
  template.innerHTML = css
  if (!template.content.childNodes.length) template.content.appendChild(new Comment())
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

export const cssTemplate = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings]
  const id = 'css' + strings.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  const { css, placeholders } = parsePlaceholders({cssArray: split(transform(mergeSplitWithPlaceholders(strings))).filter((str, i) => !(i % 2)), values})
  const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder) => [...arr,
    ...placeholder.type === 'text'
    ? placeholder.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
    : [placeholder]
  ], [])
  const build = createBuild({ id, css, placeholders: placeholdersWithFixedTextPlaceholders })
  cache.set(id, build)
  return build(values)
}

export const css = cssTemplate(str => str)
