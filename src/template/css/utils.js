import { styleProperty as makeStyleProperty, style as makeStyle, stylesheet as makeStylesheet } from './types/index.js'

export const containerQueryRegex = /:element\(((.*?)=(.*?))\)/
export const globalContainerQueryRegex = new RegExp(containerQueryRegex, 'g')

export const containerQuery = i => `oz-container-query-${i}`
export const containerQueryAttribute = i => `[oz-container-query-${i}]`
export const containerQueryAttributeRegex = /\[oz-container-query-(\d)\]/
export const globalContainerQueryAttributeRegex = new RegExp(containerQueryAttributeRegex, 'g')
// todo @banou26 rework the style templates to get rid of the CSSOM AST and only update the CSSOM based on the root stylesheet & the parser ASTRules
export const replaceRules = (oldASTRules, oldRules, newASTRules, newRules = []) => {
  const stylesheet = oldRules[0].parentStyleSheet
  const stylesheetCssRules = stylesheet.cssRules
  for (const i in newASTRules) {
    const oldASTRule = oldASTRules[i]
    const newASTRule = newASTRules[i]
    if (oldASTRule !== newASTRule) {
      const rulesArray = Array.from(stylesheetCssRules)
      const oldRule = oldRules[i]
      const oldRuleIndex = rulesArray.indexOf(oldRule)
      if (oldRule) {
        newRules.push(stylesheet.cssRules[stylesheet.insertRule(newASTRule.string, oldRuleIndex)])
        if (newASTRules[i + 1] !== oldASTRule) stylesheet.deleteRule(oldRuleIndex + 1)
      } else { // Will place the new node after the previous newly placed new node
        const previousNewRule = newRules[i - 1]
        const previousNewRuleIndex = rulesArray.indexOf(previousNewRule)
        newRules.push(stylesheet.cssRules[stylesheet.insertRule(newASTRule.string, previousNewRuleIndex)])
        if (oldRule) stylesheet.deleteRule(oldRuleIndex)
      }
    }
  }
  for (const node of oldRules.filter(node => !newRules.includes(node))) {
    const rulesArray = Array.from(stylesheetCssRules)
    if (rulesArray.includes(node)) stylesheet.deleteRule(rulesArray.indexOf(node))
  }
  if (!newRules.length) newRules.push(stylesheet.cssRules[stylesheet.insertRule('@supports (oz-node-placeholder){}', 0)])
  return newRules
}

export const placeholdersMetadataToPlaceholders = ({ element, element: { sheet }, placeholdersMetadata, childRules = Array.from(sheet.cssRules) }) => {
  const placeholders = []
  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i]
    const { type, path } = placeholderMetadata
    if (path[0] === 'cssRules') path.shift()
    const rule =
    (type === 'declaration'
      ? path.slice(0, -1)
      : path)
      .reduce((rule, attrName) => rule[attrName], childRules)
    const rules = [rule]
    if (childRules.includes(rule) && type === 'atRule') childRules.splice(childRules.indexOf(rule), 1, rules)
    let placeholder =
      (type === 'declaration'
        ? makeStyleProperty
        : type === 'ruleset'
          ? makeStyle
          : type === 'atRule'
            ? makeStylesheet
            : undefined
      )({ placeholderMetadata, rules })
    placeholder.metadata = placeholderMetadata
    placeholder.rules = rules
    placeholders.push(placeholder)
  }
  return {
    childRules,
    placeholders
  }
}
