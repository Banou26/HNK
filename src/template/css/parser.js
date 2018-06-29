import mensch from 'mensch'

const placeholderRegex = /[\u{E000}-\u{F8FF}]/umg
const placeholder = (n = 0) => String.fromCodePoint(0xE000 + n)
const charToN = str => -(0xE000 - str.codePointAt())

const parseRule = (rule, placeholders) => {
  rule.selectors.forEach(selector =>
    (selector.match(placeholderRegex) || [])
      .forEach(match => (placeholders[charToN(match)] = {
        type: 'style selector',
        rule
      })))

  rule.declarations.forEach(declaration => {
    const { name, value } = declaration
    const nameMatch = name.match(placeholderRegex)
    if (nameMatch) {
      if (!declaration.name.startsWith('--')) declaration.name = '--' + declaration.name
      nameMatch.forEach(match => (placeholders[charToN(match)] = {
        type: 'declaration name',
        declaration
      }))
    }
    const valueMatch = value.match(placeholderRegex)
    if (valueMatch) {
      declaration.value = value.replace(placeholderRegex, ' var(--$&) ')
      valueMatch.forEach(match => (placeholders[charToN(match)] = {
        type: 'declaration value',
        declaration
      }))
    }
  })
}

const parseMedia = (media, _placeholders) => {
  if (media.rules) media.rules.forEach(parseRule)
  const name = media.name
  const placeholders = media.name.match(placeholderRegex)
  placeholders.forEach(match => (_placeholders[charToN(match)] = {
    type: 'media condition',
    media,
    name
  }))
  media.name = placeholders.reduce((str, placeholder) => `${str} and (aspect-ratio: ${charToN(placeholder) + 1}/9999)`, '')
}
// CSSMediaRule.media.appendMedium / CSSMediaRule.media.mediaText
// https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet/media
// (aspect-ratio: 1/9999) and (aspect-ratio: 2/9999)

const parseKeyframe = (keyframe, placeholders) =>
  keyframe.rules &&
  (keyframe.rules.forEach(parseRule) || true) &&
  (keyframe.name.match(placeholderRegex) || [])
    .forEach(match => (placeholders[charToN(match)] = {
      type: 'keyframe name',
      keyframe
    }))

const parseStyleSheet = (styleSheet, placeholders) => styleSheet.rules.map(rule =>
  rule.type === 'rule'
    ? parseRule(rule, placeholders)
    : rule.type === 'media'
      ? parseMedia(rule, placeholders)
      : rule.type === 'keyframes'
        ? parseKeyframe(rule, placeholders)
        : undefined)

const parse = (_str, placeholders = []) => {
  const str = _str.reduce((fullStr, currentStr, i) => fullStr + currentStr + placeholder(i), '')
  console.log(str)
  const ast = mensch.parse(str)
  console.log(ast)
  parseStyleSheet(ast.stylesheet, placeholders)
  return placeholders
}
export default parse

console.log(((strings, ...values) => parse(strings))`
bruh:before ${'lol'} {
  content: " yayaya { lul }";
}

.polling_message --bruh {
  color: ${'white'};
  float${'lmao'}: left;
  margin-right: 2%;
}

.view_port {
  background-color: black;
  height: 25px;
  width: 100%;
  overflow: hidden;
}

.cylon_eye {
  background-color: red;
  background-image: linear-gradient(to right,
      rgba(0, 0, 0, .9) 25%,
      rgba(0, 0, 0, .1) 50%,
      rgba(0, 0, 0, .9) 75%);
  color: white;
  height: 100%;
  width: 20%;
  animation: 4s linear 0s infinite alternate move_eye;
}
@keyframes move_eye ${'bruh'} { bruh dude { margin-left: -20%; } to { margin-left: 100%; }  }

@media screen and (min-width: ${30}em) and (orientation: landscape){

  .cylon_eye {
    background-color: red;
    background-image: linear-gradient(to right,
        rgba(0, 0, 0, .9) 25%,
        rgba(0, 0, 0, .1) 50%,
        rgba(0, 0, 0, .9) 75%);
    color: white;
    height: 100%;
    width: 20%;
    animation: 4s linear 0s infinite alternate move_eye;
  }

}
`)
