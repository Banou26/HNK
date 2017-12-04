import {
  envCachesTemplates, placeholderRegex, indexToPlaceholder,
  placeholderRegexGlobal, joinSrcWithPlaceholders,
  placeholderStr, split, getSplitIds, execSplit, valuesDif
} from './utils.js'

function setPlaceholdersPaths (sheet, placeholders, values) {
  const rules = sheet.rules
  const arrRules = [...rules]
  for (const rulesI in arrRules) {
    const rule = arrRules[rulesI]
    if (!rule.cssText.includes('var(--oz-template-placeholder-')) continue
    for (const style of rule.style) {
      const val = rule.style[style]
      if (rule.cssText.includes('var(--oz-template-placeholder-')) {
        const valSplit = split(val)
        placeholders.push({
          type: 'value',
          ids: getSplitIds(valSplit),
          path: ['rules', rulesI, 'style', style],
          split: valSplit
        })
      }
    }
  }
}

const getStyle = (path, sheet) => path.reduce((item, i) => item[i], sheet)

export const cssTemplate = (parser, options) => {
  const cache = new Map()
  return (strings, ...values) => {
    const id = envCachesTemplates ? strings : strings.join(placeholderStr(''))
    const cached = cache.get(id)
    if (cached) return cached(...values)
    const { css } = parser(strings, values, {
      placeholderStr,
      placeholderRegex,
      placeholderRegexGlobal,
      split,
      getSplitIds,
      execSplit,
      joinSrcWithPlaceholders
    })
    const placeholders = []
    const style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = css
    document.body.appendChild(style)
    setPlaceholdersPaths(style.sheet, placeholders, values)
    document.body.removeChild(style)
    const createCachedInstance = (...values) => {
      const createInstance = _ => {
        const node = style.cloneNode(true)
        const instance = {
          values: [],
          update (...values) {
            if (values.length) this.values = values
            else values = this.values
            const { sheet } = node
            if (!sheet) return
            for (const placeholder of placeholders) {
              const path = [...placeholder.path]
              const name = path.splice(-1, 1)
              let styleDeclaration = getStyle(path, sheet)
              switch (placeholder.type) {
                case 'value':
                  styleDeclaration[name] = execSplit(placeholder.split, values).slice(6, -1)
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
