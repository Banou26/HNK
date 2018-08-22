import { html, OzHTMLTemplate, r } from '../src/index.js'

describe('HTML Template', () => {
  let container
  beforeEach(() => document.body.appendChild(container = document.createElement('div')))
  afterEach(() => container.remove() || (container = undefined))
  describe('Template literal tag', () => {
    it('return an OzHTMLTemplate instance', () => {
      expect(html``).to.instanceof(OzHTMLTemplate)
    })
    it('return is a DOM node', () => {
      expect(html``).to.instanceof(Node)
    })
    it('return is a HTMLTemplateElement node', () => {
      expect(html``).to.instanceof(HTMLTemplateElement)
    })
    it('can be appended to the document', () => {
      const template = html``
      expect(_ => container.appendChild(template)).to.not.throw()
      expect(Array.from(container.childNodes).includes(template)).to.equal(true)
      container.removeChild(template)
    })
    describe('Placeholder', () => {
      let template
      describe('text', () => {
        describe('string', () => {
          beforeEach(() => container.appendChild(template = html`${'foo'} ${'bar'} ${'baz'}<div>${'foo'} ${'bar'} ${'baz'}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template>foo bar baz<div>foo bar baz</div>')
          })
          it('update', () => {
            expect(_ => template.update('bar', 'baz', 'foo', 'bar', 'baz', 'foo')).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template>bar baz foo<div>bar baz foo</div>')
          })
        })
        describe('number', () => {
          beforeEach(() => container.appendChild(template = html`${1} ${2}<div>${1} ${2}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template>1 2<div>1 2</div>')
          })
          it('update', () => {
            expect(_ => template.update(2, 3, 2, 3)).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template>2 3<div>2 3</div>')
          })
        })
        describe('null', () => {
          beforeEach(() => container.appendChild(template = html`${null}<div>${null}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template>null<div>null</div>')
          })
          it('update', () => {
            expect(_ => template.update(null, null)).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template>null<div>null</div>')
          })
        })
        describe('undefined', () => {
          beforeEach(() => container.appendChild(template = html`${undefined}<div>${undefined}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template><div></div>')
          })
          it('update', () => {
            expect(_ => template.update(undefined, undefined)).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template><div></div>')
          })
        })
        describe('reactive promise', () => {
          const promise = val => r(new Promise((resolve, reject) => setTimeout(_ => resolve(val), 0.5)))
          beforeEach(() => container.appendChild(template = html`${promise('foo')}<div>${promise('bar')}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', async () => {
            expect(container).to.have.html('<template is="oz-html-template"></template><div></div>')
            await template.values[0]
            await template.values[1]
            expect(container).to.have.html('<template is="oz-html-template"></template>foo<div>bar</div>')
          })
          it('update', async () => {
            expect(_ => template.update(promise('bar'), promise('baz'))).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template><div></div>')
            await template.values[0]
            await template.values[1]
            expect(container).to.have.html('<template is="oz-html-template"></template>bar<div>baz</div>')
          })
        })
        describe('html template', () => {
          beforeEach(() => container.appendChild(template = html`${html`foo`} ${html`bar`} ${html`baz`}<div>${html`foo`} ${html`bar`} ${html`baz`}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template>foo bar baz<div>foo bar baz</div>')
          })
          it('update', () => {
            expect(_ => template.update(html`bar`, html`baz`, html`foo`, html`bar`, html`baz`, html`foo`)).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template>bar baz foo<div>bar baz foo</div>')
          })
        })
        describe('array', () => {
          beforeEach(() => container.appendChild(template = html`${['foo', 'bar', 'baz']}`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template>foobarbaz')
          })
          it('update', () => {
            expect(_ => template.update(['bar', 'baz', 'foo'])).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template>barbazfoo')
          })
        })
      })
      xdescribe('tag name', () => {
        it('accept dynamic tags', () => {
          expect(_ => html`<foo-${'bar'}></foo-${'bar'}>`).to.not.throw()
        })
      })
      xdescribe('comment', () => {
        it('accept dynamic comment', () => {
          expect(_ => html`<!-- foo ${'bar'} ${'baz'} -->`).to.not.throw()
        })
      })
      xdescribe('attribute', () => {
        it('accept dynamic attributes', () => {
          expect(_ => html`<foo bar${'baz'}="foo ${'bar'} baz"></foo>`).to.not.throw()
        })
      })
    })
  })
})
