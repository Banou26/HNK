import { css, OzStyle } from '../src/index.js'

describe('CSS Template', () => {
  let container
  beforeEach(() => document.body.appendChild(container = document.createElement('div')))
  afterEach(() => container.remove() || (container = undefined))
  describe('Template literal tag', () => {
    it('return an OzHTMLTemplate instance', () => {
      expect(css``).to.instanceof(OzStyle)
    })
    it('return is a DOM node', () => {
      expect(css``).to.instanceof(Node)
    })
    it('return is a HTMLStyleElement node', () => {
      expect(css``).to.instanceof(HTMLStyleElement)
    })
    it('can be appended to the document', () => {
      const style = css``
      expect(_ => container.appendChild(style)).to.not.throw()
      expect(Array.from(container.childNodes).includes(style)).to.equal(true)
    })
  })

  xdescribe('#.scoped', () => {
    it('return is a HTMLStyleElement node', () => {
      expect(css.scoped``).to.instanceof(HTMLStyleElement)
    })
  })

  describe('Placeholder', () => {
    let style
    describe('stylesheet import', () => {
      let rule
      describe('static css', () => {
        beforeEach(() => container.appendChild(style = css`${css`.foo {}`}`) && (rule = style.sheet.cssRules[0]))
        afterEach(() => style.remove() || (style = undefined))
        it('append', () => {
          expect(rule.selectorText).to.equal('.foo')
        })
        it('update', () => {
          expect(_ => style.update(css`.bar {}`)).to.not.throw()
          rule = style.sheet.cssRules[0]
          expect(rule.selectorText).to.equal('.bar')
        })
      })
      describe('dynamic css', () => {
        beforeEach(() => container.appendChild(style = css`${css`.${'foo'} {}`}`) && (rule = style.sheet.cssRules[0]))
        afterEach(() => style.remove() || (style = undefined))
        it('append', () => {
          expect(rule.selectorText).to.equal('.foo')
        })
        it('update', () => {
          expect(_ => style.update(css`.${'bar'} {}`)).to.not.throw()
          expect(rule).to.equal(style.sheet.cssRules[0])
          expect(rule.selectorText).to.equal('.bar')
        })
      })
    })
    describe('style selector', () => {
      let rule
      beforeEach(() => container.appendChild(style = css`.foo${'bar'}baz {}`) && (rule = style.sheet.cssRules[0]))
      afterEach(() => style.remove() || (style = undefined))
      it('append', () => {
        expect(rule.selectorText).to.equal('.foobarbaz')
      })
      it('update', () => {
        expect(_ => style.update('rab')).to.not.throw()
        expect(rule.selectorText).to.equal('.foorabbaz')
      })
    })
    describe('style declaration', () => {
      describe('value', () => {
        let styles
        beforeEach(() => container.appendChild(style = css`.foo { color: ${'red'}; }`) && (styles = style.sheet.cssRules[0].style))
        afterEach(() => style.remove() || (style = undefined))
        it('append', () => {
          expect(styles.getPropertyValue('color')).to.equal('red')
        })
        it('update', () => {
          expect(_ => style.update('green')).to.not.throw()
          expect(styles.getPropertyValue('color')).to.equal('green')
        })
      })
      // keep the tests that break color syntaxing at the bottom
      describe('name', () => {
        let styles
        afterEach(() => style.remove() || (style = undefined))
        it('append', () => {
          expect(styles.getPropertyValue('color')).to.equal('red')
        })
        it('update', () => {
          expect(_ => style.update('background-color')).to.not.throw()
          expect(styles.getPropertyValue('color')).to.equal('')
          expect(styles.getPropertyValue('background-color')).to.equal('red')
        })
        beforeEach(() => container.appendChild(style = css`.foo { ${'color'}: red; }`) && (styles = style.sheet.cssRules[0].style))
      })
    })
  })
})
