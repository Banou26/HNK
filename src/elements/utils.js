export const elementContext = Symbol.for('OzElementContext')

export const mixins = []
export const mixin = obj => mixins.push(obj)
const currentContexts = []

export const callMixin = (context, options, mixin) => {
  const parentContext = currentContexts[currentContexts.length - 1]
  mixin({ context, options, ...parentContext && parentContext !== context && { parentContext: parentContext } })
}

export const getMixinProp = (mixins, prop) => mixins.filter(mixin => prop in mixin).map(mixin => mixin[prop])

export const pushContext = (context, func) => {
  currentContexts.push(context)
  try {
    return func()
  } finally {
    currentContexts.pop()
  }
}

export const htmlTemplateChangedError = new Error('The HTML template returned in the template method changed')
export const noHTMLTemplateError = new Error('No HTML template returned in the template method')
export const ozStyleChangedError = new Error('The OzStyle element returned in the style changed')
export const noOzStyleError = new Error('No OzStyle element returned in the style method')
