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
export const cssTemplateChangedError = new Error('The CSS template returned in the style changed')
export const noCSSTemplateError = new Error('No CSS template returned in the style method')
