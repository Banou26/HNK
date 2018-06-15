class StyleNode {
  constructor() {
    this.start = 0
    this.end = 0
    this.previous = undefined
    this.parent = undefined
    this.rules = undefined
    this.parsedCssText = ''
    this.cssText = ''
    this.atRule = false
    this.type = 0
    this.keyframesName = ''
    this.selector = ''
    this.parsedSelector = ''
  }
}

export default text => {
  text = clean(text)
  return parseCss(lex(text), text)
}

const clean = cssText => cssText.replace(RX.comments, '').replace(RX.port, '')

const lex = text => {
  let root = new StyleNode();
  root.start = 0
  root.end = text.length
  let n = root
  for (let i = 0, l = text.length; i < l; i++) {
    if (text[i] === OPEN_BRACE) {
      if (!n.rules) {
        n.rules = []
      }
      let p = n
      let previous = p.rules[p.rules.length - 1] || null
      n = new StyleNode()
      n.start = i + 1
      n.parent = p
      n.previous = previous
      p.rules.push(n)
    } else if (text[i] === CLOSE_BRACE) {
      n.end = i + 1
      n = n.parent || root
    }
  }
  return root
}

const parseCss = (node, text) => {
  let t = text.substring(node.start, node.end - 1)
  node.parsedCssText = node.cssText = t.trim()
  if (node.parent) {
    let ss = node.previous ? node.previous.end : node.parent.start
    t = text.substring(ss, node.start - 1)
    t = expandUnicodeEscapes(t)
    t = t.replace(RX.multipleSpaces, ' ')
    t = t.substring(t.lastIndexOf(';') + 1)
    let s = node.parsedSelector = node.selector = t.trim()
    node.atRule = (s.indexOf(AT_START) === 0)
    if (node.atRule) {
      if (s.indexOf(MEDIA_START) === 0) {
        node.type = types.MEDIA_RULE
      } else if (s.match(RX.keyframesRule)) {
        node.type = types.KEYFRAMES_RULE
        node.keyframesName = node.selector.split(RX.multipleSpaces).pop()
      }
    } else {
      if (s.indexOf(VAR_START) === 0) {
        node.type = types.MIXIN_RULE
      } else {
        node.type = types.STYLE_RULE
      }
    }
  }
  let r$ = node.rules
  if (r$) {
    for (let i = 0, l = r$.length, r; (i < l) && (r = r$[i]); i++) {
      parseCss(r, text)
    }
  }
  return node
}

const expandUnicodeEscapes = s => {
  return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
    let code = arguments[1],
      repeat = 6 - code.length
    while (repeat--) {
      code = '0' + code
    }
    return '\\' + code
  });
}

const stringify = (node, preserveProperties, text = '') => {
  let cssText = '';
  if (node.cssText || node.rules) {
    let r$ = node.rules
    if (r$ && !hasMixinRules(r$)) {
      for (let i = 0, l = r$.length, r; (i < l) && (r = r$[i]); i++) {
        cssText = stringify(r, preserveProperties, cssText)
      }
    } else {
      cssText = preserveProperties ? node.cssText :
        removeCustomProps(node.cssText)
      cssText = cssText.trim();
      if (cssText) {
        cssText = '  ' + cssText + '\n'
      }
    }
  }
  if (cssText) {
    if (node.selector) {
      text += node.selector + ' ' + OPEN_BRACE + '\n'
    }
    text += cssText;
    if (node.selector) {
      text += CLOSE_BRACE + '\n\n'
    }
  }
  return text;
}

const hasMixinRules = ([r]) => r && r.selector && !r.selector.indexOf(VAR_START)

const removeCustomProps = (cssText) => removeCustomPropApply(removeCustomPropAssignment(cssText))

const removeCustomPropAssignment = (cssText) => cssText.replace(RX.customProp, '').replace(RX.mixinProp, '')

const removeCustomPropApply = (cssText) => cssText.replace(RX.mixinApply, '').replace(RX.varApply, '')

const types = {
  STYLE_RULE: 1,
  KEYFRAMES_RULE: 7,
  MEDIA_RULE: 4,
  MIXIN_RULE: 1000
}

const OPEN_BRACE = '{'
const CLOSE_BRACE = '}'

const RX = {
  comments: /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
  port: /@import[^;]*;/gim,
  customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
  mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
  mixinApply: /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
  varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
  keyframesRule: /^@[^\s]*keyframes/,
  multipleSpaces: /\s+/g
}

const VAR_START = '--'
const MEDIA_START = '@media'
const AT_START = '@'

// const rliteral = char => `(?:\\${char}(?:\\\\.|[^\\\\${char}\\\\])*\\${char})`
// const rstring = `(?:${rliteral(`"`)}|${rliteral(`'`)})`
// const rimport = `(?:@import (?:url\\((?:${rstring}|[^)]*)\\)|${rstring})(?: [^;]*);)`
// const rcomment = /\/\*.*?\*\//
// console.log(new RegExp(rimport))

// const firstPlaceholder = String.fromCodePoint(0xfffff)

// const parsePlaceholders = str => {

// }