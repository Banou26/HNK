export const OzElement = Symbol.for('OzElement')
export const OzElementContext = Symbol.for('OzElementContext')

export const mixins = []
export const mixin = obj => mixins.push(obj)

export const getMixinProp = (mixins, prop) =>
  mixins
    .filter(mixin => prop in mixin)
    .map(mixin => mixin[prop])

export const htmlTemplateChangedError = new Error('The HTML template returned in the template method changed')
export const noHTMLTemplateError = new Error('No HTML template returned in the template method')
export const ozStyleChangedError = new Error('The OzStyle element returned in the style changed')
export const noOzStyleError = new Error('No OzStyle element returned in the style method')
