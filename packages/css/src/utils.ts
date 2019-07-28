// placeholders range U+F0000..U+FFFFD
export const placeholderMinRangeChar = '󰀀'
export const placeholderMinRangeCode = placeholderMinRangeChar.codePointAt(0)

export const placeholderMaxRangeChar = '󿿽'
export const placeholderMaxRangeCode = placeholderMaxRangeChar.codePointAt(0)

export const placeholdersRegex = new RegExp(`[${placeholderMinRangeChar}-${placeholderMaxRangeChar}]`, 'umg') // /[󰀀-󿿽]/umg
export const placeholderRegex = new RegExp(placeholdersRegex, 'um')

export const toPlaceholder = (n = 0) => String.fromCodePoint(placeholderMinRangeCode + n)

export const fromPlaceholder = str => str.codePointAt() - placeholderMinRangeCode

export const matchSelectorRulesets = (str, matchedStrRuleset = []) =>
  str
    .replace(/(".*?"|'.*?'|:-webkit-any\(.*?\))/g, (_, str) =>
      toPlaceholder(matchedStrRuleset.push(str)))
    .split(',')
    .map(str =>
      str.replace(placeholderRegex, char =>
        matchedStrRuleset[fromPlaceholder(char) - 1])
        .trim())
