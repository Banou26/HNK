export const placeholderRegex = /[-]/umg
export const placeholder = (n = 0) => String.fromCodePoint(0xE000 + n)
export const charToN = str => str.codePointAt() - 0xE000
