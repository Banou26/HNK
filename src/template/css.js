import { cssTemplate } from './css-template.js'

export const css = cssTemplate((source, values, { placeholderStr, joinSrcWithPlaceholders }) => {
  let src = source[0]
  for (const i in values) {
    if (i === 0) continue
    src += `var(--${placeholderStr(i)})${source[parseInt(i) + 1]}`
  }
  return {css: src}
})
// todo: add features with a css parser, https://github.com/reworkcss/css/blob/master/lib/parse/index.js
