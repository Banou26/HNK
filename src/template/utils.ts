// placeholders first range U+E000..U+F8FF
export const placeholderMinRangeChar = ''
export const placeholderMinRangeCode = placeholderMinRangeChar.codePointAt()

export const placeholderMaxRangeChar = ''
export const placeholderMaxRangeCode = placeholderMaxRangeChar.codePointAt()

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

// placeholders first range U+E000..U+F8FF //

// placeholders second range U+F0000..U+FFFFD
export const placeholder2MinRangeChar = '󰀀'
export const placeholder2MinRangeCode = placeholder2MinRangeChar.codePointAt()

export const placeholder2MaxRangeChar = '󿿽'
export const placeholder2MaxRangeCode = placeholder2MaxRangeChar.codePointAt()

export const placeholder2Regex = new RegExp(`[${placeholder2MinRangeChar}-${placeholder2MaxRangeChar}]`, 'umg') // /[󰀀-󿿽]/umg
export const singlePlaceholder2Regex = new RegExp(placeholder2Regex, 'um')

export const placeholder2 = (n = 0) => String.fromCodePoint(placeholder2MinRangeCode + n)

export const charToN2 = str => str.codePointAt() - placeholder2MinRangeCode

export const matchSelectorRulesets = (str, matchedStrRuleset = []) =>
  str
    .replace(/(".*?"|'.*?'|:-webkit-any\(.*?\))/g, (_, str) =>
      placeholder2(matchedStrRuleset.push(str)))
    .split(',')
    .map(str =>
      str.replace(placeholder2Regex, char =>
        matchedStrRuleset[charToN2(char) - 1])
        .trim())
// placeholders second range U+F0000..U+FFFFD //
