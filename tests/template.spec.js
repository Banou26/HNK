import { html, css } from '../src/index.js'
import * as chai from 'chai'
let expect = chai.expect
chai.should()
let assert = chai.assert

describe('Template', function () {
  describe('html', function () {
    let container
    beforeEach(function () {
      container = document.createElement('div')
      document.body.appendChild(container)
    })
    afterEach(function () {
      document.body.removeChild(container)
    })

    it('should render text nodes with a function', function () {
      let setVal
      let instance = html`${setValue => {
        setVal = setValue
        setValue('foo')
      }} bar ${'foo2'} bar2 ${'foo3'} bar3`()
      container.appendChild(instance.content)
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('foobar bar foobar2 bar2 foobar3 bar3')
      setVal('updatedfoo')
      container.innerHTML.should.equal('updatedfoo bar foobar2 bar2 foobar3 bar3')
    })

    it('should render text nodes', function () {
      let instance = html`${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3`()
      container.appendChild(instance.content)
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('foobar bar foobar2 bar2 foobar3 bar3')
    })

    it('should render comment node with a function', function () {
      let instance = html`<!-- ${setValue => setValue('foo')} bar ${'foo2'} bar2 ${'foo3'} bar3 -->`()
      container.appendChild(instance.content)
      container.innerHTML.should.equal('<!-- foo bar foo2 bar2 foo3 bar3 -->')
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('<!-- foobar bar foobar2 bar2 foobar3 bar3 -->')
    })

    it('should render comment node', function () {
      let instance = html`<!-- ${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3 -->`()
      container.appendChild(instance.content)
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('<!-- foobar bar foobar2 bar2 foobar3 bar3 -->')
    })

    it('should render element node', function () {
      let propValue = {}
      let instance = html`<${'div'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue}>${'text'}<div></div></${'div'}>`()
      container.appendChild(instance.content)
      let newPropValue = {}
      instance.update('span', 'tr2', 'foobar', 'op2', newPropValue, 'text2', 'span')
      container.innerHTML.should.equal('<span attr2="foo foobar">text2<div></div></span>')
      container.children[0].prop2.should.equal(newPropValue)
    })

    it('should render instance', function () {
      let instance = html`${html`<div>${'foo'}</div>`}`()
      container.appendChild(instance.content)
      instance.update(html`<span>${'bar'}</span>`)
      container.innerHTML.should.equal('<span>bar</span>')
    })

    it('should render dom nodes', function () {
      let instance = html`<div>${new Text('foo')}</div>`()
      container.appendChild(instance.content)
      instance.update(new Text('bar'))
      container.innerHTML.should.equal('<div>bar</div>')
    })

    it('should render arrays items', function () {
      let instance = html`${['foo', new Comment('bar'), document.createElement('div')]}`()
      container.appendChild(instance.content)
      instance.update(['foo2', new Comment('bar2'), document.createElement('span')])
      container.innerHTML.should.equal(`foo2<!--bar2--><span></span>`)
    })
  })
  describe('css', function () {
    let container
    beforeEach(function () {
      container = document.createElement('div')
      document.body.appendChild(container)
    })
    afterEach(function () {
      document.body.removeChild(container)
    })

    it('should render style node', function () {
      let instance = css`div {
        color: ${'red'};
      }`()
      container.appendChild(instance.content)
      instance.update()
      window.getComputedStyle(container).color.should.equal('rgb(255, 0, 0)')
      instance.update('cyan')
      window.getComputedStyle(container).color.should.equal('rgb(0, 255, 255)')
    })
  })
})
