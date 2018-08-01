export const placeholderRegex = /[\u{D700}-\u{D799}]/umg
export const placeholder = (n = 0) => String.fromCodePoint(0xD799 - n)
export const charToN = str => 0xD799 - str.codePointAt()
