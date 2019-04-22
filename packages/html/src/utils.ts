import { PlaceholderType, PlaceholderMetadataType } from './types.ts'

// placeholders range U+E000..U+F8FF
export const placeholderMinRangeChar = ''
export const placeholderMinRangeCode = placeholderMinRangeChar.codePointAt(0)

export const placeholderMaxRangeChar = ''
export const placeholderMaxRangeCode = placeholderMaxRangeChar.codePointAt(0)

export const placeholdersRegex = new RegExp(`[${placeholderMinRangeChar}-${placeholderMaxRangeChar}]`, 'umg') // /[-]/umg
export const placeholderRegex = new RegExp(placeholdersRegex, 'um')

export const toPlaceholder = (n = 0) => String.fromCodePoint(placeholderMinRangeCode + n)

export const fromPlaceholder = str => str.codePointAt() - placeholderMinRangeCode

export const toPlaceholdersNumber = str => (str.match(placeholdersRegex) || []).map(i => fromPlaceholder(i))

export const toPlaceholderString =
  (str, placeholders = toPlaceholdersNumber(str)) =>
    values =>
      placeholders.reduce((str, i) => str.replace(toPlaceholder(i), values[i]), str)

export const replace = (arrayFragment, ...vals) =>
  arrayFragment.splice(0, arrayFragment.length, ...vals)

const placeholderTypeMapping = new Map([
  [ PlaceholderType.COMMENT, PlaceholderMetadataType.COMMENT ],
  [ PlaceholderType.TEXT, PlaceholderMetadataType.TEXT ],
  [ PlaceholderType.START_TAG, PlaceholderMetadataType.ELEMENT ],
  [ PlaceholderType.END_TAG, PlaceholderMetadataType.ELEMENT ]
])

export const placeholderTypeToPlaceholderMetadataType =
  (type: PlaceholderType) =>
    placeholderTypeMapping.get(type)
