import { Element, html, css } from '../src/index.js'
import * as chai from 'chai'
chai.should()

const cssPlaceholderRegex = /var\(--oz-template-placeholder-(\d*)-[\w]*?\)/g

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
    class CustomElement extends Element {
      state () {
        return {
          foo: 'foo',
          bar: 'bar',
          get foobar () {
            return this.foo + this.bar
          },
          class1Color: 'red'
        }
      }

      static template ({ foo, foobar, bar }) {
        return html`
        <div class="class1">
          ${foo}
          ${foobar}
          ${bar}
        </div>`
      }

      static style ({ class1Color }) {
        return css`
        class1 {
          color: ${class1Color};
        }`
      }
    }

    const elem = document.createElement('custom-element')
    customElements.define('custom-element', CustomElement)
    container.appendChild(elem)
    const _container = container.childNodes[0].shadowRoot || container.childNodes[0]
    _container.innerHTML.replace(cssPlaceholderRegex, '').should.equal(`
        <div class="class1">
          foo
          foobar
          bar
        </div><style type="text/css">
        class1 {
          color: var(--oz-template-placeholder-0-abc);
        }</style>`.replace(cssPlaceholderRegex, ''))
    const styleNode = _container.childNodes[_container.childNodes.length - 1]
    styleNode.sheet.rules[0].style.color.should.equal('red')
    elem.state.foo = 'bar'
    elem.state.class1Color = 'cyan'
    styleNode.sheet.rules[0].style.color.should.equal('cyan')
    _container.innerHTML.replace(cssPlaceholderRegex, '').should.equal(`
        <div class="class1">
          bar
          barbar
          bar
        </div><style type="text/css">
        class1 {
          color: var(--oz-template-placeholder-0-abc);
        }</style>`.replace(cssPlaceholderRegex, ''))
  })
})
