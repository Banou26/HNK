import { css as cssUtils } from './utils.js'
const { placeholder: placeholderStr, split, getSplitValueIndexes: getSplitIds, mergeSplitWithValues: execSplit } = cssUtils

async function setPlaceholdersPaths (sheet, placeholders, values) {
  const rules = sheet.cssRules
  const arrRules = [...rules]
  for (const rulesI in arrRules) {
    const rule = arrRules[rulesI]
    if (!rule.cssText.includes('var(--oz-template-placeholder-')) continue
    for (const style of rule.style) {
      const val = rule.style[style]
      if (val.includes('var(--oz-template-placeholder-')) {
        const valSplit = split(val)
        placeholders.push({
          type: 'value',
          ids: getSplitIds(valSplit),
          path: ['cssRules', rulesI, 'style', style],
          split: valSplit
        })
      }
    }
  }
}

const getStyle = (path, sheet) => path.reduce((item, i) => item[i], sheet)

export const cssTemplate = (parser, options) => {
  const cache = new Map()
  return (_strings, ...values) => {
    const strings = [..._strings]
    const id = strings.join(placeholderStr(''))
    const cached = cache.get(id)
    if (cached) return cached(...values)
    const { css } = parser(strings, values)
    const placeholders = []
    // For non-in-shadow elements
    // const style = document.createElement('link')
    // const blob = new Blob([css], { type: 'text/css' })
    // const url = window.URL.createObjectURL(blob)
    // style.type = 'text/css'
    // style.rel = 'stylesheet'
    // style.href = url

    // For in-shadow elements
    // const blob = new Blob([css], { type: 'text/css' })
    // const url = window.URL.createObjectURL(blob)
    // style.type = 'text/css'
    // style.innerHTML = `@import url('${url}')`

    const style = document.createElement('style')
    style.innerHTML = css
    document.body.appendChild(style)
    setPlaceholdersPaths(style.sheet, placeholders, values) // setPlaceholdersPaths is async to make firefox gucci since they deal asynchronously with css parsing
    document.body.removeChild(style)
    const createCachedInstance = (...values) => {
      const createInstance = _ => {
        const node = style.cloneNode(true)
        const instance = {
          values: [],
          update (...values) {
            if (values.length) instance.values = values
            else values = instance.values
            const { sheet } = node
            if (!sheet) return
            for (const placeholder of placeholders) {
              const path = [...placeholder.path]
              const name = path.splice(-1, 1)
              let styleDeclaration = getStyle(path, sheet)
              switch (placeholder.type) {
                case 'value':
                  setTimeout(_ => (styleDeclaration[name] = execSplit(placeholder.split, values).slice(6, -1)), 0)
                  break
              }
            }
          },
          content: node
        }
        instance.update(...values)
        return instance
      }
      createInstance.id = id
      createInstance.values = values
      return createInstance
    }
    cache.set(id, createCachedInstance)
    return createCachedInstance(...values)
  }
}
