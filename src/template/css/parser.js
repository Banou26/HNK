import { NodeFactory, Stringifier, Parser } from 'shady-css-parser'
import { containerQueryRegex } from './utils.js'
import { placeholderRegex, singlePlaceholderRegex, placeholder as toPlaceholder, charToN } from '../utils.js'

const makeMethod = name => (_this, ...args) => ({
  ...NodeFactory.prototype[name].apply(_this, args),
  ...singlePlaceholderRegex.test(args[0]) ? { type: `${name}Placeholder` } : undefined
})

const parser = new Parser(new class Factory extends NodeFactory {
  ruleset (...args) {
    return {
      ...super.ruleset(...args),
      ...singlePlaceholderRegex.test(args[0]) || args[0].includes(':element') ? { type: `rulesetPlaceholder` } : undefined
    }
  }

  expression (...args) {
    return {
      ...super.expression(...args),
      ...singlePlaceholderRegex.test(args[0]) ? { type: `expressionPlaceholder` } : undefined
    }
  }

  atRule (...args) {
    return {
      ...super.atRule(...args),
      ...args[0] === 'supports' && singlePlaceholderRegex.test(args[1]) ? { type: 'atRulePlaceholder' } : undefined
    }
  }

  declaration (...args) {
    return {
      ...super.declaration(...args),
      ...singlePlaceholderRegex.test(args[0]) || singlePlaceholderRegex.test(args[1].text) ? { type: 'declarationPlaceholder' } : undefined
    }
  }
}())

const stringifier = new class extends Stringifier {
  atRulePlaceholder (...args) { return super.atRule(...args) }
  rulesetPlaceholder ({ selector, rulelist }) { return `${selector.replace(/:element\((.*?)\)/g, '')}${this.visit(rulelist)}` }
  declarationPlaceholder ({ name, value }) { return `--${name}${value ? `:${this.visit(value)}` : ''}` }
  expressionPlaceholder ({ text }) { return text.replace(placeholderRegex, 'var(--$&)') }
}()

const findPlaceholdersAndPaths = (
  rule,
  placeholders = [],
  _path = [],
  path = [..._path],
  { type, selector, name, value, parameters, text = type.startsWith('declaration') ? value.text : undefined } = rule,
  vals = [selector || name || value, text || parameters]
) =>
  // match, create PlaceholderMetadata and push to placeholders
  (void (type && type.endsWith('Placeholder') && type !== 'expressionPlaceholder' && placeholders.push({
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
  })) ||
  // search for placeholders in childs
  Array.isArray(rule)
    ? rule.forEach((rule, i) => findPlaceholdersAndPaths(rule, placeholders, [...path, i]))
    : rule.type.startsWith('ruleset')
      ? rule.rulelist.rules
        .filter(({type}) => type === 'declarationPlaceholder')
        .forEach(rule => findPlaceholdersAndPaths(rule, placeholders, [...path, 'style', rule.name]))
      : rule.type.startsWith('atRule')
        ? rule.rulelist?.rules.forEach((rule, i) => findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i]))
        : rule.type.startsWith('stylesheet')
          ? rule.rules.forEach((rule, i) => findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i]))
          : undefined) ||
  placeholders

export default (
  { transform, strings, values },
  ast = parser.parse(transform(strings.reduce((str, str2, i) =>
    `${str}${
      typeof values[i - 1] === 'object'
        ? `@supports (${toPlaceholder(i - 1)}) {}`
        : toPlaceholder(i - 1)
    }${str2}`)))
) =>
  ast.rules.forEach(rule => (rule.string = stringifier.stringify(rule))) ||
  ({
    ast,
    css: stringifier.stringify(ast),
    placeholdersMetadata: findPlaceholdersAndPaths(ast)
  })
