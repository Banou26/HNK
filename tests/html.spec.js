import { html, OzHTMLTemplate } from '../src/index.js'

fdescribe('HTML Template', () => {
  describe('Template literal tag', () => {
    it('return an OzHTMLTemplate instance', () => {
      expect(html``).to.instanceof(OzHTMLTemplate)
    })
    it('return is a DOM node', () => {
      expect(html``).to.instanceof(Node)
    })
    it('return is a Comment node', () => {
      expect(html``).to.instanceof(Comment)
    })
    // it('accept static html', () => {
    //   expect(_ => html`
    //   <!-- comment -->
    //   text
    //   <div class="class">
    //     childText
    //     <span></span>
    //   </div>
    //   `).to.not.throw()
    // })
    it('can be appended to the document', () => {
      const template = html``
      expect(_ => document.body.appendChild(template)).to.not.throw()
      document.body.removeChild(template)
    })
    describe('Placeholder', () => {
      describe('text', () => {
        it('accept static html', () => {
          expect(_ => html`${'foo'} ${'bar'} ${'baz'}`).to.not.throw()
        })
      })
      fdescribe('tag name', () => {
        it('accept static html', () => {
          expect(_ => html`<my-${'element'}></my-${'element'}><my-${'element'}></my-${'element'}>`).to.not.throw()
        })
      })
    })
  })
})
