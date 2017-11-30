const envCachesTemplates = (t => t() === t())(_ => (s => s)``)
const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
const placeholderRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`)
const placeholderRegexAll = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g')

const attributeRegex = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`)

/**
 * Find in the string template placeholders and return an array of id
 * @param {string} str
 * @return {string[]} ids
 */
const getPlaceholdersId = str => str.split(placeholderRegexAll).filter((str, i) => i % 2)

const placeholderStr = id => `oz-template-placeholder-${id}-${random}`

const templatize = str => values => str.split(placeholderRegexAll).map((str, i) => i % 2 ? values[str] : str).join('')

/**
 * Parse, find and return the html context of each placeholders
 * contexts (types): comment, endTagName, startTagName, attribute
 * @param {string} html
 * @return {object[]} placeholders
 */
const parsePlaceholders = (html) => {
  let placeholders = []
  const advance = n => (html = html.substring(n))
  const addPlaceholders = (type, str, other) => getPlaceholdersId(str).map(id => placeholders.push({id, type, str, ...other}))

  while (html) { // eslint-disable-line no-unmodified-loop-condition
    const textEnd = html.indexOf('<')
    if (textEnd === 0) {
      if (html.startsWith('<!--')) { // Comment
        const commentEnd = html.indexOf('-->')
        if (commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${html.substring(0, textEnd)}"`)
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
        while (!(end = html.match(startTagClose)) && (attr = html.match(attributeRegex))) {
          attributes.push(attr)
          advance(attr[0].length)
        }
        if (!end) throw new Error(`Start tag not closed, can't continue the template parsing "${html.substring(0, textEnd)}"`)
        addPlaceholders('startTagName', startTagMatch[1])
        for (const attr of attributes) {
          addPlaceholders('attribute', attr[0], {match: attr})
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

const createInstance = (template, _placeholders, _values) => {
  const dynamics = new Map()
  const docFrag = document.importNode(template.content, true)
  const childNodes = [...docFrag.childNodes]

  const render = (...values) => {
    console.log('render', values)
    for (const [_placeholderStr, dynamic] of dynamics) {
      dynamic.setValue(values)
    }
    render.values = _values
    render.childNodes = childNodes
    return render
  }
  render.values = _values
  render.childNodes = childNodes

  for (const placeholder of _placeholders) {
    const { id, type, str, match } = placeholder
    if (dynamics.has(str)) continue
    if (type === 'startTagName') {
      const _placeholderStr = placeholderStr(id)
      const element = docFrag.querySelector(`[${_placeholderStr}]`)
      element.removeAttribute(_placeholderStr)
      dynamics.set(str, {
        element,
        nameTemplate: templatize(str),
        dependents: [],
        setValue (values) {
          const newElem = this.element.parentNode.insertBefore(document.createElement(this.nameTemplate(values)), this.element)
          if (childNodes.includes(this.element)) {
            childNodes.splice(childNodes.indexOf(this.element), 1, newElem)
          }
          while (this.element.firstChild) newElem.appendChild(this.element.firstChild)
          for (const dependent of this.dependents) {
            dependent.element = newElem
            dependent.setValue(values)
          }
        }
      })
    } else if (type === 'attribute') {
      if (match[5]) { // Property (attribute without quotes)
        const _placeholderStr = placeholderStr(id)
        const element = docFrag.querySelector(`[${_placeholderStr}]`)
        element.removeAttribute(_placeholderStr)
        const valueId = getPlaceholdersId(match[5])[0]
        dynamics.set(str, {
          element,
          nameTemplate: templatize(match[1]),
          valueId,
          setValue (values) {
            this.element[this.nameTemplate(values)] = values[this.valueId]
          }
        })
      } else { // Attribute
        const element = docFrag.querySelector(`[${str}]`)
        dynamics.set(str, {
          element,
          name: match[1],
          nameTemplate: templatize(match[1]),
          valueTemplate: templatize(match[3]),
          setValue (values) {
            if (this.name) this.element.removeAttribute(this.name)
            this.element.setAttribute((this.name = this.nameTemplate(values)), this.valueTemplate(values))
          }
        })
      }
    }
  }
  let lastTag
  for (const [str, dynamic] of dynamics) {
    if (dynamic.dependents) {
      lastTag = dynamic
    } else if (dynamic.element === lastTag.element) {
      lastTag.dependents.push(dynamic)
    }
  }
  const dependences = [...dynamics].map(dynamic => dynamic[1]).filter(dynamic => dynamic.dependents).map(dynamic => dynamic.element)
  for (const dynamic of dynamics) {
    if (dynamic.element && dynamic.valueTemplate && !dependences.includes(dynamic.element)) { // Property or attribute
      dependences.dependents.push(dynamic)
    }
  }
  const walker = document.createTreeWalker(docFrag, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, null, false)
  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const match = currentNode.nodeValue.match(placeholderRegex)
      if (match) {
        const _placeholderStr = match[0]
        const id = match[1]
        const placeholderNode = currentNode.splitText(match.index)
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(_placeholderStr.length)
        placeholderNode.splitText(0)
        dynamics.set(_placeholderStr, {
          value: null,
          nodes: [placeholderNode],
          setValue (values) { // todo: add features to this func
            const oldNodes = this.nodes
            const newNodes = []
            const parent = oldNodes[0].parentNode || docFrag
            const value = values[id]
            if (typeof value === 'string') { // String
              newNodes.push(new Text(value))
            } else if (Array.isArray(value)) { // Array
              for (const val of value) {
                if (typeof val === 'string') {
                  newNodes.push(new Text(val))
                } else if (val instanceof Node) {
                  newNodes.push(val)
                } else if (typeof val === 'function') {

                }
              }
            } else if (typeof value === 'function') { // Function / Template
              const setValue = _value => {
                const setValueArr = [...values]
                setValueArr[id] = _value
                this.setValue(setValueArr)
                if (render.setValue) render.setValue(render) // aze
              }
              console.log('aze', value, value.id, value.values, value.childNodes)
              if (value.id && value.values) {
                if (value.childNodes) {  // Template instance
                  value.setValue = setValue
                  for (const node of value.childNodes) newNodes.push(node)
                } else {   // Template build

                }
              } else {
                value(setValue)
              }
            }
            for (const node of newNodes) parent.insertBefore(node, oldNodes[0])
            if (childNodes.includes(oldNodes[0])) childNodes.splice(childNodes.indexOf(oldNodes[0]), oldNodes.length, ...newNodes)
            for (const node of oldNodes) parent.removeChild(node)
            this.nodes = newNodes
          }
        })
      }
    } else if (currentNode.nodeType === Node.COMMENT_NODE) {
      const content = currentNode.nodeValue
      if (content.search(placeholderRegexAll)) {
        dynamics.set(content, {
          node: currentNode,
          valueTemplate: templatize(content),
          setValue (values) {
            this.node.nodeValue = this.valueTemplate(values)
          }
        })
      }
    }
  }
  const iterator = document.createNodeIterator(docFrag, NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, null)
  while (iterator.nextNode()) {
    if (!childNodes.includes(iterator.referenceNode)) childNodes.push(iterator.referenceNode)
  }
  // console.log('render', JSON.stringify([...dynamics], (key, val) => typeof val === 'function' ? 'function' : val, 2))
  render(..._values)
  return render
}

const templateCache = new Map()

export const html = (strings, ..._values) => {
  const templateId = envCachesTemplates ? strings : strings.join(placeholderStr(''))
  let cachedCreateInstance = templateCache.get(templateId)
  if (cachedCreateInstance) {
    return cachedCreateInstance(_values)
  }
  let html = strings[0] + [...strings].splice(1).map((str, i) => placeholderStr(i) + str).join('')
  const placeholders = parsePlaceholders(html)
  for (const { type, str, match } of placeholders) {
    if (type === 'startTagName') {
      const tagName = str.replace(placeholderRegexAll, (match, id) => _values[id])
      const selectorAttributes = placeholders.filter(_placeholder => _placeholder.str === str).map(({id}) => placeholderStr(id)).join(' ')
      html = html.replace(str, `${tagName} ${selectorAttributes}`)
    } else if (type === 'endTagName') {
      html = html.replace(str, str.replace(placeholderRegexAll, (match, id) => _values[id]))
    } else if (type === 'attribute') {
      if (match[5]) { // Property (attribute without quotes)
        html = html.replace(str, ' ' + placeholders.filter(_placeholder => _placeholder.str === str).map(({id}) => placeholderStr(id)).join(' '))
      }
    }
  }
  const template = document.createElement('template')
  template.innerHTML = html
  const _createInstance = values => {
    const __createInstance = (setValue, instance) => createInstance(template, placeholders, values)
    __createInstance.id = templateId
    __createInstance.values = _values
    return __createInstance
  }
  templateCache.set(templateId, _createInstance)
  return _createInstance(_values)
}
