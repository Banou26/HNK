import { Element, html } from '../src/index.js'
import * as chai from 'chai'
chai.should()
describe('Element', _ => {
  let container
  beforeEach(function () {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(function () {
    document.body.removeChild(container)
  })

  it('should render Element node', function () {
    const CustomElement = class CustomElement extends Element {
      state () {
        return {
          foo: 'foo',
          bar: 'bar',
          get foobar () {
            return this.foo + this.bar
          }
        }
      }

      static template (state) {
        return html`
        <div>
          ${state.foo}
          ${state.foobar}
          ${state.bar}
        </div>`
      }
    }

    const elem = document.createElement('custom-element')
    customElements.define('custom-element', CustomElement)
    container.appendChild(elem)

    container.childNodes[0].innerHTML.should.equal(`
        <div>
          foo
          foobar
          bar
        </div>`)
    elem.state.foo = 'bar'
    container.childNodes[0].innerHTML.should.equal(`
        <div>
          bar
          foobar
          bar
        </div>`)
  })
})
