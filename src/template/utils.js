export const html = (_ => {
  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  const regex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`)
  const globalRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')
  const placeholder = id => `oz-template-placeholder-${id}-${random}`
  const split = str => str.split(globalRegex)
  const getSplitValueIndexes = split => split.filter((str, i) => i % 2)
  const mergeSplitWithValues = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('')
  const mergeSplitWithPlaceholders = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholder(i) + str).join('')
  const indexPlaceholders = placeholders => placeholders.reduce((arr, placeholder) => [...arr, ...(placeholder.indexes || [placeholder.index]).map(id => placeholder)], [])
  const differenceIndexes = (arr1, arr2) => arr1.length >= arr2.length ? arr1.reduce((arr, val, i) => [...arr, ...val === arr2[i] ? [] : [i]], []) : differenceIndexes(arr2, arr1)
  return {
    random,
    regex,
    globalRegex,
    placeholder,
    split,
    getSplitValueIndexes,
    mergeSplitWithValues,
    mergeSplitWithPlaceholders,
    indexPlaceholders,
    differenceIndexes
  }
})()
