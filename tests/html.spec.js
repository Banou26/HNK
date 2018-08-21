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
            const div = container.childNodes[7]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('foo')
            expect(container.childNodes[4].data).to.equal('bar')
            expect(container.childNodes[6].data).to.equal('baz')
            expect(div.childNodes[1].data).to.equal('foo')
            expect(div.childNodes[3].data).to.equal('bar')
            expect(div.childNodes[5].data).to.equal('baz')
          })
          it('update', () => {
            const div = container.childNodes[7]
            expect(_ => template.update('bar', 'baz', 'foo', 'bar', 'baz', 'foo')).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('bar')
            expect(container.childNodes[4].data).to.equal('baz')
            expect(container.childNodes[6].data).to.equal('foo')
            expect(div.childNodes[1].data).to.equal('bar')
            expect(div.childNodes[3].data).to.equal('baz')
            expect(div.childNodes[5].data).to.equal('foo')
          })
        })
        describe('number', () => {
          beforeEach(() => container.appendChild(template = html`${1} ${2}<div>${1} ${2}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            const div = container.childNodes[5]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('1')
            expect(container.childNodes[4].data).to.equal('2')
            expect(div.childNodes[1].data).to.equal('1')
            expect(div.childNodes[3].data).to.equal('2')
          })
          it('update', () => {
            const div = container.childNodes[5]
            expect(_ => template.update(2, 3, 2, 3)).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('2')
            expect(container.childNodes[4].data).to.equal('3')
            expect(div.childNodes[1].data).to.equal('2')
            expect(div.childNodes[3].data).to.equal('3')
          })
        })
        describe('null', () => {
          beforeEach(() => container.appendChild(template = html`${null}<div>${null}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            const div = container.childNodes[3]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('null')
            expect(div.childNodes[1].data).to.equal('null')
          })
          it('update', () => {
            const div = container.childNodes[3]
            expect(_ => template.update(null, null)).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('null')
            expect(div.childNodes[1].data).to.equal('null')
          })
        })
        describe('undefined', () => {
          beforeEach(() => container.appendChild(template = html`${undefined}<div>${undefined}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            const div = container.childNodes[3]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('')
            expect(div.childNodes[1].data).to.equal('')
          })
          it('update', () => {
            const div = container.childNodes[3]
            expect(_ => template.update(undefined, undefined)).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('')
            expect(div.childNodes[1].data).to.equal('')
          })
        })
        describe('reactive promise', () => {
          const promise = val => r(new Promise((resolve, reject) => setTimeout(_ => resolve(val), 0.5)))
          beforeEach(() => container.appendChild(template = html`${promise('foo')}<div>${promise('bar')}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', async () => {
            const div = container.childNodes[3]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('Oz reactive promise placeholder')
            expect(div.childNodes[1].data).to.equal('Oz reactive promise placeholder')
            await template.values[0]
            await template.values[1]
            expect(container.childNodes[2].data).to.equal('foo')
            expect(div.childNodes[1].data).to.equal('bar')
          })
          it('update', async () => {
            const div = container.childNodes[3]
            expect(_ => template.update(promise('bar'), promise('baz'))).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('Oz reactive promise placeholder')
            expect(div.childNodes[1].data).to.equal('Oz reactive promise placeholder')
            await template.values[0]
            await template.values[1]
            expect(container.childNodes[2].data).to.equal('bar')
            expect(div.childNodes[1].data).to.equal('baz')
          })
        })
        describe('html template', () => {
          beforeEach(() => container.appendChild(template = html`${html`foo`} ${html`bar`} ${html`baz`}<div>${html`foo`} ${html`bar`} ${html`baz`}</div>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            const div = container.childNodes[7]
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('foo')
            expect(container.childNodes[4].data).to.equal('bar')
            expect(container.childNodes[6].data).to.equal('baz')
            expect(div.childNodes[1].data).to.equal('foo')
            expect(div.childNodes[3].data).to.equal('bar')
            expect(div.childNodes[5].data).to.equal('baz')
          })
          it('update', () => {
            const div = container.childNodes[7]
            expect(_ => template.update(html`bar`, html`baz`, html`foo`, html`bar`, html`baz`, html`foo`)).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('bar')
            expect(container.childNodes[4].data).to.equal('baz')
            expect(container.childNodes[6].data).to.equal('foo')
            expect(div.childNodes[1].data).to.equal('bar')
            expect(div.childNodes[3].data).to.equal('baz')
            expect(div.childNodes[5].data).to.equal('foo')
          })
        })
        describe('array', () => {
          beforeEach(() => container.appendChild(template = html`${['foo', 'bar', 'baz']}`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('foo')
            expect(container.childNodes[3].data).to.equal('bar')
            expect(container.childNodes[4].data).to.equal('baz')
          })
          it('update', () => {
            expect(_ => template.update(['bar', 'baz', 'foo'])).to.not.throw()
            expect(container.childNodes[0]).to.equal(template)
            expect(container.childNodes[2].data).to.equal('bar')
            expect(container.childNodes[3].data).to.equal('baz')
            expect(container.childNodes[4].data).to.equal('foo')
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
