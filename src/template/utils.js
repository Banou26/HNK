export const envCachesTemplates = (t => t() === t())(_ => (s => s)``)
export const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
export const placeholderRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`)
export const placeholderRegexGlobal = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')

export const isBuild = value =>
  value.hasOwnProperty('id') &&
  value.hasOwnProperty('values')

export const placeholderStr = id => `oz-template-placeholder-${id}-${random}`

export const split = str => str.split(placeholderRegexGlobal)

export const getSplitIds = split => split.filter((str, i) => i % 2)

export const execSplit = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('')

export const indexToPlaceholder = (placeholders) => {
  const arr = []
  for (const placeholder of placeholders) {
    for (const id of placeholder.ids) arr.push(placeholder) // eslint-disable-line no-unused-vars
  }
  return arr
}

export const valuesDif = (values, values2) => {
  let dif = []
  const highestLength = values.length > values2.length ? values.length : values2.length
  for (let i = 0; i < highestLength; i++) {
    if (values[i] !== values2[i]) dif.push(i)
  }
  return dif
}

// export const joinSrcWithPlaceholders = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholderStr(i) + str).join('')
export const joinSrcWithPlaceholders = strings => {
  let str = strings[0]
  for (const i in strings) {
    if (i === 0) continue
    str += placeholderStr(i) + (strings[parseInt(i) + 1] || '')
  }
  return str
}
