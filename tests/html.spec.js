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
          const promise = val => r(new Promise((resolve, reject) => setTimeout(_ => resolve(val), 25)))
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
        describe('node', () => {
          beforeEach(() => container.appendChild(template = html`${document.createElement('div')}`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template><div></div>')
          })
          it('update', () => {
            expect(_ => template.update(document.createElement('span'))).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template><span></span>')
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
      describe('element', () => {
        describe('tag name', () => {
          beforeEach(() => container.appendChild(template = html`<foo-${'bar'}></foo-${'bar'}>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar></foo-bar>')
          })
          it('update', () => {
            expect(_ => template.update('baz', 'baz')).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template><foo-baz></foo-baz>')
          })
        })
        describe('attribute name', () => {
          beforeEach(() => container.appendChild(template = html`<foo-bar foo${'-bar'}="baz"></foo-bar>`))
          afterEach(() => template.remove() || (template = undefined))
          it('append', () => {
            expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo-bar="baz"></foo-bar>')
          })
          it('update', () => {
            expect(_ => template.update('-baz')).to.not.throw()
            expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo-baz="baz"></foo-bar>')
          })
        })
        describe('attribute value', () => {
          describe('double quote', () => {
            beforeEach(() => container.appendChild(template = html`<foo-bar foo="${'bar'}"></foo-bar>`))
            afterEach(() => template.remove() || (template = undefined))
            it('append', () => {
              expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo="bar"></foo-bar>')
            })
            it('update', () => {
              expect(_ => template.update('baz')).to.not.throw()
              expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo="baz"></foo-bar>')
            })
          })
          describe('single quote', () => {
            beforeEach(() => container.appendChild(template = html`<foo-bar foo='${'bar'}'></foo-bar>`))
            afterEach(() => template.remove() || (template = undefined))
            it('append', () => {
              expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo="bar"></foo-bar>')
            })
            it('update', () => {
              expect(_ => template.update('baz')).to.not.throw()
              expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar foo="baz"></foo-bar>')
            })
          })
          describe('unquoted', () => {
            describe('property', () => {
              let element
              beforeEach(() => container.appendChild(template = html`<foo-bar foo=${'bar'}></foo-bar>`) && (element = container.childNodes[1]))
              afterEach(() => template.remove() || (template = undefined))
              it('append', () => {
                expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar></foo-bar>')
                expect(element).to.have.property('foo').equal('bar')
              })
              it('update', () => {
                expect(_ => template.update('baz')).to.not.throw()
                expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar></foo-bar>')
                expect(element).to.have.property('foo').equal('baz')
              })
            })
            describe('event listener', () => {
              let element, test, test2
              beforeEach(() => container.appendChild(template = html`<foo-bar on-click=${ev => (test = ev)}></foo-bar>`) && (element = container.childNodes[1]))
              afterEach(() => template.remove() || (template = undefined) || (test = undefined) || (test2 = undefined))
              it('append', () => {
                element.click()
                expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar></foo-bar>')
                expect(test).to.instanceof(MouseEvent)
              })
              it('update', () => {
                expect(_ => template.update(ev => (test2 = ev))).to.not.throw()
                element.click()
                expect(container).to.have.html('<template is="oz-html-template"></template><foo-bar></foo-bar>')
                expect(test).to.equal(undefined)
                expect(test2).to.instanceof(MouseEvent)
              })
            })
          })
        })
      })
      describe('comment', () => {
        beforeEach(() => container.appendChild(template = html`<!-- ${'foo'} bar ${'baz'} -->`))
        afterEach(() => template.remove() || (template = undefined))
        it('append', () => {
          expect(container).to.have.html('<template is="oz-html-template"></template><!-- foo bar baz -->')
        })
        it('update', () => {
          expect(_ => template.update('baz', 'foo')).to.not.throw()
          expect(container).to.have.html('<template is="oz-html-template"></template><!-- baz bar foo -->')
        })
      })
    })
  })
})
