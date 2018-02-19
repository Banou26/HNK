import { placeholderRegex, joinSrcWithPlaceholders, split } from './utils.js'
import { parseHtml, html } from './html.js'
import { htmlTemplate } from './html-template.js'

const voidTags = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr']

// todo: rework this file + add way to escape '.' in tag name

const lineRegex = /^(\s*)(?:([.#\w-]*)(?:\((.*)\))?)(?: (.*))?/

const identifiersRegex = /([#.])([a-z0-9-]*)/g
const classRegex = /class="(.*)"/

const makeHTML = ({tag, attributes, childs, textContent, id, classList}) => {
  const classStr = classList.join(' ')
  let attrStr = attributes ? ' ' + attributes : ''
  if (attrStr.match(classRegex)) attrStr = attrStr.replace(classRegex, (match, classes) => `class="${classes} ${classStr}"`)
  else if (classStr) attrStr += ` class="${classStr}"`
  if (tag) return `<${tag}${id ? ` id="${id}"` : ''}${attrStr}>${textContent || ''}${childs.map(line => makeHTML(line)).join('')}${voidTags.includes(tag) ? '' : `</${tag}>`}`
  else return '\n' + textContent
}

const pushLine = ({childs: currentChilds}, line) => {
  if (currentChilds.length && currentChilds[currentChilds.length - 1].indentation < line.indentation) pushLine(currentChilds[currentChilds.length - 1], line)
  else currentChilds.push(line)
}
const hierarchise = arr => {
  const hierarchisedArr = []
  for (let line of arr) {
    if (hierarchisedArr.length && hierarchisedArr[hierarchisedArr.length - 1].indentation < line.indentation) pushLine(hierarchisedArr[hierarchisedArr.length - 1], line)
    else hierarchisedArr.push(line)
  }
  return hierarchisedArr
}

const pozToHTML = str => {
  const srcArr = str.split('\n').filter(line => line.trim().length).map(line => {
    const lineMatch = line.match(lineRegex)
    const tag = lineMatch[2].match(/([a-z0-9-]*)/)[1]
    const identifiers = lineMatch[2].slice(tag.length)
    const matches = []
    let match, id
    while ((match = identifiersRegex.exec(identifiers))) matches.push(match)
    const classList = []
    for (const item of matches) item[1] === '#' ? id = item[2] : undefined // eslint-disable-line
    for (const item of matches) item[1] === '.' ? classList.push(item[2]) : undefined // eslint-disable-line
    const isText = line.trimLeft()[0] === '|'
    let textContent = isText ? line.trimLeft().slice(2) : lineMatch[4]
    const isTemplate = tag && !tag.replace(placeholderRegex, '').length
    if (isTemplate) textContent = tag
    return {
      indentation: lineMatch[1].length,
      tag: isText || isTemplate ? undefined : tag || 'div',
      attributes: lineMatch[3],
      id,
      classList,
      textContent,
      childs: []
    }
  })
  const hierarchisedArr = hierarchise(srcArr)
  const html = hierarchisedArr.map(line => makeHTML(line)).join('')
  return html
}

export const _poz = (strings, ...values) => {
  const pozWithPlaceholders = joinSrcWithPlaceholders(strings)
  const htmlWithPlaceholders = pozToHTML(pozWithPlaceholders)
  const htmlSplit = split(htmlWithPlaceholders)
  return parseHtml(htmlSplit.filter((str, i) => !(i % 2)), ...values)
}

export const poz = htmlTemplate(_poz)
