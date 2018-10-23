import { NodeFactory, Stringifier, Parser } from 'shady-css-parser'
import { containerQueryRegex } from './utils.js'
import { placeholderRegex, singlePlaceholderRegex, placeholder as toPlaceholder, charToN, matchSelectorRulesets } from '../utils.js'

const makeMethod = name => (_this, ...args) => ({
  ...NodeFactory.prototype[name].apply(_this, args),
  ...singlePlaceholderRegex.test(args[0]) ? { type: `${name}Placeholder` } : undefined
})

const parser = new Parser(new class Factory extends NodeFactory {
  ruleset (_selector, ...args) {
    const selector =
      !_selector.startsWith('@') &&
      matchSelectorRulesets(_selector)
        .map(ruleset =>
        ruleset.startsWith(':scope')
          ? ruleset
          : `:scope ${ruleset}`).join('')
    return {
      ...super.ruleset(_selector, ...args),
      _selector,
      selector/*: _selector*/,
      ...!_selector.startsWith('@') && { type: 'rulesetPlaceholder' }
      // ...(singlePlaceholderRegex.test(_selector) || _selector.includes(':element')) && { type: `rulesetPlaceholder` }
    }
  }

  expression (...args) {
    return {
      ...super.expression(...args),
      ...singlePlaceholderRegex.test(args[0]) && { type: `expressionPlaceholder` }
    }
  }

  atRule (...args) {
    return {
      ...super.atRule(...args),
      ...args[0] === 'supports' && singlePlaceholderRegex.test(args[1]) && { type: 'atRulePlaceholder' }
    }
  }

  declaration (...args) {
    return {
      ...super.declaration(...args),
      ...(singlePlaceholderRegex.test(args[0]) || singlePlaceholderRegex.test(args[1].text)) && { type: 'declarationPlaceholder' }
    }
  }
}())

const stringifier = new class extends Stringifier {
  atRulePlaceholder (...args) { return super.atRule(...args) }
  rulesetPlaceholder ({ selector, rulelist }) { return `${selector.replace(/:element\((.*?)\)/g, '')}${this.visit(rulelist)}` }
  declarationPlaceholder ({ name, value }) { return `--${name}${value ? `:${this.visit(value)}` : ''}` }
  expressionPlaceholder ({ text }) { return `${text.replace(placeholderRegex, 'var(--$&)')}${text.endsWith(';') ? '' : ';'}` }
}()

const findPlaceholdersAndPaths = (
  rule,
  placeholders = [],
  _path = [],
  path = [..._path],
  { type, selector, name, value, parameters, text = type.startsWith('declaration') ? value.text : undefined } = rule,
  vals = [selector || name || value, text || parameters]
) => {
  // match, create PlaceholderMetadata and push to placeholders
  if (type && type.endsWith('Placeholder') && type !== 'expressionPlaceholder') {
    placeholders.push({
      type: type.slice(0, -'Placeholder'.length),
      values: vals,
      ids:
        vals
          .filter(_ => _)
          .map(val => (val.match(placeholderRegex) || [])
            .map(char => charToN(char)))
          .flat(Infinity),
      path,
      rule
    })
  }
  // search for placeholders in childs
  if (Array.isArray(rule)) {
    for (const i in rule) findPlaceholdersAndPaths(rule[i], placeholders, [...path, i])
  } else if (rule.type.startsWith('ruleset')) {
    const rules = rule.rulelist.rules.filter(({type}) => type === 'declarationPlaceholder')
    for (const i in rules) {
      const rule = rules[i]
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'style', rule.name])
    }
  } else if (rule.type.startsWith('atRule')) {
    const rules = rule.rulelist?.rules
    for (const i in rules) {
      const rule = rules[i]
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i])
    }
  } else if (rule.type.startsWith('stylesheet')) {
    const rules = rule.rules
    for (const i in rules) {
      const rule = rules[i]
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i])
    }
  }
  return placeholders
}

export default (
  { transform, strings, values },
  ast = parser.parse(transform(strings.reduce((str, str2, i) =>
    `${str}${
      typeof values[i - 1] === 'object'
        ? `@supports (${toPlaceholder(i - 1)}) {}`
        : toPlaceholder(i - 1)
    }${str2}`)))
) => {
  ast.rules.forEach(rule => (rule.string = stringifier.stringify(rule)))
  return {
    ast,
    css: stringifier.stringify(ast),
    placeholdersMetadata: findPlaceholdersAndPaths(ast)
  }
}
