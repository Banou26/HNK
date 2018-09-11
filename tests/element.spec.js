import { html, css, registerElement, OzElementSymbol, OzElementContextSymbol } from '../src/index.js'

const usedTags = []

const tagName = (name, tag = `${name || 'foo'}-${Math.random().toString(36).substring(7)}`) =>
  usedTags.includes(tag)
    ? tagName(name)
    : usedTags.push(tag) && tag

describe('OzElement', () => {
  let container, Class, instance
  const setElement = options =>
    (Class = registerElement({ name: tagName(), ...options })) &&
    container.appendChild(instance = document.createElement(Class.name))
  beforeEach(() => document.body.appendChild(container = document.createElement('div')))
  afterEach(() => container.remove() || (container = undefined) || (instance = undefined))
  it('return an OzElement instance', () => {
    setElement()
    expect(instance).to.have.property(OzElementSymbol)
  })
  describe('options', () => {
    describe('#name', () => {
      it('set the element tag name', () => {
        const tag = tagName()
        setElement({ name: tag })
        expect(instance.tagName).to.equal(tag.toUpperCase())
      })
    })
    describe('#template', () => {
      it('set the element content', () => {
        setElement({ template: _ => html`foo bar` })
        expect(instance.childNodes[0].data).to.equal('foo bar')
      })
      it('throw an error if template changed', () => {
        setElement({ template: ({ state: { foo } }) => foo ? html`foo bar` : html`bar baz` })
        expect(instance.childNodes[0].data).to.equal('bar baz')
        expect(_ => (instance[OzElementContextSymbol].state.foo = true)).to.throw()
      })
    })
    describe('#style', () => {
      it('set the element content', () => {
        setElement({ style: _ => css`.foo {}` })
        expect(Array.from(document.head.childNodes).pop().sheet.cssRules[0].selectorText).to.equal('.foo')
      })
      xdescribe('scoped', () => {
        it('set the element content', () => {
          setElement({ style: _ => css.scoped`.foo {}` })
          expect(Array.from(document.head.childNodes).pop().sheet.cssRules[0].selectorText).to.equal('.foo')
        })
      })
      describe('shadowDom', () => {
        it('set the element content', () => {
          setElement({ shadowDom: 'open', style: _ => css`.foo {}` })
          expect(instance.shadowRoot.childNodes[0].sheet.cssRules[0].selectorText).to.equal('.foo')
        })
      })
    })
  })
})
