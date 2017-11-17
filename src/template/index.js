const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
const templatePlaceholder = id => `oz-template-placeholder-${id}-${random}`
const templatePlaceholderRegexAll = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

const templateCache = new Map()

/**
 * Find in the string template placeholders and return an array of their ids
 * @param {string} str
 * @return {string[]} ids
 */
const getPlaceholders = str => {
  const ids = []
  let match
  while ((match = templatePlaceholderRegexAll.exec(str))) ids.push(match[1])
  return ids
}

/**
 * Parse, find and return the html context of each placeholders
 * contexts (types): comment, endTagName, startTagName, attribute
 * @param {string} html
 * @return {object[]} placeholders
 */
const parsePlaceholders = (html) => {
  let placeholders = []
  const advance = n => (html = html.substring(n))
  const addPlaceholders = (type, str, values) => {
    for (const id of getPlaceholders(str)) placeholders.push({id, type, str, values})
  }

  while (html) { // eslint-disable-line no-unmodified-loop-condition
    const textEnd = html.indexOf('<')
    if (textEnd === 0) {
      if (html.startsWith('<!--')) { // Comment
        const commentEnd = html.indexOf('-->')
        if (commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${html}"`)
        addPlaceholders('comment', html.substring(4, commentEnd))
        advance(commentEnd + 3)
        continue
      }

      const endTagMatch = html.match(endTag)
      if (endTagMatch) { // End tag
        addPlaceholders('endTagName', endTagMatch[1])
        advance(endTagMatch[0].length)
        continue
      }

      const startTagMatch = html.match(startTagOpen)
      if (startTagMatch) { // Start tag
        advance(startTagMatch[0].length)
        const attributes = []
        let end, attr
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          attributes.push(attr)
          advance(attr[0].length)
        }
        if (!end) throw new Error(`Start tag not closed, can't continue the template parsing "${html}"`)
        addPlaceholders('startTagName', startTagMatch[1], attributes)
        for (const attr of attributes) {
          addPlaceholders('attribute', attr[0], attr)
        }
        advance(end[0].length)
        continue
      }
    }
    const textContent = html.substring(0, textEnd !== -1 ? textEnd : textEnd.length)
    addPlaceholders('text', textContent)
    advance(textContent.length)
  }
  return placeholders
}

const createInstance = (template, placeholders, _values) => {
  const nodes = new Map()
  const listeners = new Map()
  const content = document.importNode(template.content, true)
  for (const placeholder of placeholders) {
    const { id, type, str, values } = placeholder
    if (type === 'startTagName') {
      const placehodlerName = templatePlaceholder(id)
      const element = content.querySelector(`[${placehodlerName}]`)
      nodes.set(id, element)
      element.removeAttribute(placehodlerName)
    } else if (type === 'attribute') {
      if (values[5]) { // Property (attribute without quotes)
        const placehodlerName = templatePlaceholder(id)
        const element = content.querySelector(`[${placehodlerName}]`)
        nodes.set(id, element)
        element.removeAttribute(placehodlerName)
      } else { // Attribute
        nodes.set(id, content.querySelector(`[${str}]`).getAttributeNode(values[1]))
      }
    }
  }
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, null, false)
  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    const ids = getPlaceholders(currentNode.nodeValue)
    for (const id of ids) {
      const placeholderName = templatePlaceholder(id)
      if (currentNode.nodeType === 3) { // Text
        if (currentNode.nodeValue.indexOf(placeholderName) !== -1) {
          const placeholderElem = currentNode.splitText(currentNode.nodeValue.indexOf(placeholderName))
          placeholderElem.nodeValue = placeholderElem.nodeValue.replace(placeholderName, '')
          placeholderElem.splitText(0)
          // placeholderElem.nodeValue = _values[id]
          nodes.set(id, [placeholderElem])
        }
      } else { // Comment
        // currentNode.nodeValue = currentNode.nodeValue.replace(placeholderName, _values[id])
        nodes.set(id, currentNode)
      }
    }
  }
  const render = (...values) => {
    const passed = []
    for (let i in values) {
      const placeholder = placeholders[i]
      const { id, type, str } = placeholder
      if (type === 'endTagName') continue
      if (type !== 'text') {
        let alreadyPassed = false
        str.replace(templatePlaceholderRegexAll, (match, id) => {
          if (passed.includes(id)) alreadyPassed = true
        })
        if (alreadyPassed) continue
        passed.push(id)
      }
      const pvalues = placeholder.values
      const node = nodes.get(id)
      if (type === 'startTagName') {
        const newNode = document.createElement(str.replace(templatePlaceholderRegexAll, (match, id) => values[id]))
        for (const attr of [...node.attributes]) { // Attributes
          node.removeAttributeNode(attr)
          newNode.setAttributeNode(attr)
        }
        pvalues.filter(attr => attr[5]).map(property => { // Properties
          getPlaceholders([...property[1], ...property[5]].join('')).map(id => nodes.set(id, newNode))
          const propName = property[1].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          const placeholdersValue = getPlaceholders(property[5])
          let propValue
          if (placeholdersValue.length === 1) {
            propValue = values[placeholdersValue[0]]
          } else {
            propValue = property[5].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          }
          if (propName.startsWith('on-')) { // Event
            const eventType = propName.substring(3)
            listeners.set(id, {
              type: eventType,
              handler: newNode.addEventListener(eventType, propValue)
            })
          } else { // property
            newNode[propName] = propValue
          }
        })
        const parent = node.parentNode || content
        while (node.childNodes.length > 0) {
          newNode.appendChild(node.childNodes[0])
        }
        nodes.set(id, newNode)
        parent.insertBefore(newNode, node)
        parent.removeChild(node)
      } else if (type === 'attribute') {
        if (pvalues[5]) { // Property (attribute without quotes)
          const propName = pvalues[1].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          const placeholdersValue = getPlaceholders(pvalues[5])
          let propValue
          if (placeholdersValue.length === 1) {
            propValue = values[placeholdersValue[0]]
          } else {
            propValue = pvalues[5].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          }
          if (propName.startsWith('on-')) { // Event
            if (listeners.has(id)) {
              const oldListener = listeners.get(id)
              node.removeEventListener(oldListener.type, oldListener.handler)
            }
            const eventType = propName.substring(3)
            listeners.set(id, {
              type: eventType,
              listener: node.addEventListener(eventType, propValue)
            })
          } else { // property
            node[propName] = propValue
          }
        } else { // Attribute
          const parentNode = node.ownerElement
          const attrName = pvalues[1].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          if (parentNode.getAttributeNode(attrName) === node) {
            node.value = pvalues[3].replace(templatePlaceholderRegexAll, (match, id) => values[id])
          } else {
            const newAttr = document.createAttribute(attrName)
            getPlaceholders([...pvalues[1], ...pvalues[3]].join('')).map(id => nodes.set(id, newAttr))
            newAttr.value = pvalues[3].replace(templatePlaceholderRegexAll, (match, id) => values[id])
            parentNode.removeAttributeNode(node)
            parentNode.setAttributeNode(newAttr)
          }
        }
      } else if (type === 'text') {
        let isBuild = typeof values[id] === 'function' && Array.isArray(values[id].values)
        let instance
        try {
          if (isBuild) {
            instance = values[id]()
          }
        } catch (err) {
          instance = null
          console.error(err)
          // throw err
        }
        let isInstance = isBuild && instance && instance.content && instance.content instanceof DocumentFragment
        if (isInstance) {
          let docFrag = instance.content
          nodes.set(id, [...docFrag.childNodes])
          let parent = node[0] ? node[0].parentNode : null || content
          parent.insertBefore(docFrag, parent.childNodes[0])
          for (const i2 in node) {
            parent.removeChild(node[i2])
          }
        } else {
          node[0].nodeValue = values[id]
        }
      } else if (type === 'comment') {
        node.nodeValue = str.replace(templatePlaceholderRegexAll, (match, id) => values[id])
      }
    }
    render.values = values
    return render
  }
  render.values = _values
  render.content = content
  render.apply(null, _values)
  return render
}

export const html = (strings, ..._values) => {
  let cachedCreateInstance = templateCache.get(strings)
  if (cachedCreateInstance) {
    return cachedCreateInstance(_values)
  }
  let html = strings[0] + [...strings].splice(1).map((str, i) => templatePlaceholder(i) + str).join('')
  const placeholders = parsePlaceholders(html)
  for (const { type, str, values } of placeholders) {
    if (type === 'startTagName') {
      const tagName = str.replace(templatePlaceholderRegexAll, (match, id) => _values[id])
      const selectorAttributes = placeholders.filter(_placeholder => _placeholder.str === str).map(({id}) => templatePlaceholder(id)).join(' ')
      html = html.replace(str, `${tagName} ${selectorAttributes}`)
    } else if (type === 'endTagName') {
      html = html.replace(str, str.replace(templatePlaceholderRegexAll, (match, id) => _values[id]))
    } else if (type === 'attribute') {
      if (values[5]) { // Property (attribute without quotes)
        html = html.replace(str, ' ' + placeholders.filter(_placeholder => _placeholder.str === str).map(({id}) => templatePlaceholder(id)).join(' '))
      }
    }
  }
  const template = document.createElement('template')
  template.innerHTML = html
  const _createInstance = values => createInstance(template, placeholders, values)
  templateCache.set(strings, _createInstance)
  return _createInstance(_values)
}
