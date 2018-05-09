export const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
export const regex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`)
export const globalRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')
export const placeholder = id => `oz-template-placeholder-${id}-${random}`
export const split = str => str.split(globalRegex)
export const getSplitValueIndexes = split => split.filter((str, i) => i % 2)
export const mergeSplitWithValues = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('')
export const mergeSplitWithPlaceholders = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholder(i) + str).join('')
export const indexPlaceholders = placeholders => placeholders.reduce((arr, placeholder) => [...arr, ...(placeholder.indexes || [placeholder.index]).map(id => placeholder)], [])
export const differenceIndexes = (arr1, arr2) => arr1.length >= arr2.length ? arr1.reduce((arr, val, i) => [...arr, ...val === arr2[i] ? [] : [i]], []) : differenceIndexes(arr2, arr1)
export const ref = name => ({ htmlReference: true, name })
