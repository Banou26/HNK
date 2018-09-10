export const placeholderMinRangeChar = ''
export const placeholderMinRangeCode = placeholderMinRangeChar.charCodeAt()

export const placeholderMaxRangeChar = ''
export const placeholderMaxRangeCode = placeholderMaxRangeChar.charCodeAt()

export const placeholderRegex = new RegExp(`[${placeholderMinRangeChar}-${placeholderMaxRangeChar}]`, 'umg') // /[-]/umg
export const singlePlaceholderRegex = new RegExp(placeholderRegex, 'um')

export const placeholder = (n = 0) => String.fromCodePoint(placeholderMinRangeCode + n)

export const charToN = str => str.codePointAt() - placeholderMinRangeCode

export const toPlaceholdersNumber = str => (str.match(placeholderRegex) || []).map(i => charToN(i))

export const toPlaceholderString =
  (str, placeholders = toPlaceholdersNumber(str)) =>
    values =>
      placeholders.reduce((str, i) => str.replace(placeholder(i), values[i]), str)

export const replace = (arrayFragment, ...vals) =>
  arrayFragment.splice(0, arrayFragment.length, ...vals)
