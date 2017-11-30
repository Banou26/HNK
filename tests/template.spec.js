import { html } from '../src/index.js'
import * as chai from 'chai'
let expect = chai.expect
chai.should()
let assert = chai.assert

describe('Template', function () {
  describe('build function (literal tag)', function () {
    it('should build text nodes', function () {
      expect(_ => html`bar ${'foo'} bar2 ${'foo2'} bar3 ${'foo3'} bar4`).to.not.throw()
    })

    it('should build comment node', function () {
      expect(_ => html`<!-- bar ${'foo'} bar2 ${'foo2'} bar3 ${'foo3'} bar4 -->`).to.not.throw()
    })

    it('should build element node', function () {
      // html`<${'d'}i${'v'} a${'tt'}r="foo ${'bar'}"></${'d'}i${'v'}>`
      expect(_ => html`<${'d'}i${'v'} a${'tt'}r="foo ${'bar'}"></${'d'}i${'v'}>`).to.not.throw()
    })

    it('should build instance', function () {
      expect(_ => html`${html`${'foo'}`}`).to.not.throw()
    })

    it('should build html', function () {
      expect(_ => html`
      <!-- ${'comment'} -->
      ${'text'}
      <${'d'}i${'v'} at${'tr'}="foo ${'bar'}" pr${'op'}=${{}}>${
        html`<d${'iv'}>${'foo'}</di${'v'}>`
      }</${'d'}i${'v'}>`).to.not.throw()
    })
  })
  describe('instance function', function () {
    let container

    beforeEach(function () {
      container = document.createElement('div')
      document.body.appendChild(container)
    })
    afterEach(function () {
      document.body.removeChild(container)
    })

    it('should create text nodes', function () {
      let instance = html`bar ${'foo'} bar2 ${'foo2'} bar3 ${'foo3'} bar4`()
      container.appendChild(instance.content)
      container.innerHTML.should.equal('bar foo bar2 foo2 bar3 foo3 bar4')
    })

    it('should create comment node', function () {
      let instance = html`<!-- bar ${'foo'} bar2 ${'foo2'} bar3 ${'foo3'} bar4 -->`()
      container.appendChild(instance.content)
      container.innerHTML.should.equal('<!-- bar foo bar2 foo2 bar3 foo3 bar4 -->')
    })

    it('should create element node', function () {
      let propValue = {}
      let instance = html`<${'d'}i${'v'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue} ${'on'}-${'click'}=${_ => console.log('click')}></${'d'}i${'v'}>`()
      container.appendChild(instance.content)
      container.innerHTML.should.equal('<div attr="foo bar"></div>')
      container.children[0].prop.should.equal(propValue)
    })

    it('should create instance', function () {
      let instance = html`${html`<d${'iv'}>${'foo'}</di${'v'}>`}`()
      // let instance = html`${html`<div>${'foo'}</div>`}`()
      // let instance = html`<div>${'foo'}</div>`()
      // console.log(instance.childNodes, container)
      container.appendChild(instance.content)
      container.innerHTML.should.equal('<div>foo</div>')
    })

    it('should create html', function () {
      let propValue = {}
      let instance
      let value = 0
      expect(_ => (instance = html`
      <!-- ${'comment'} -->
      ${'text'}
      <${'d'}i${'v'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue} ${'on'}-${'click'}=${_ => (value = 5)}>
        ${html`<d${'iv'}>${'foo'}</di${'v'}>`}
      </${'d'}i${'v'}>`())).not.to.throw()
      container.appendChild(instance.content)
      container.innerHTML.should.equal(`
      <!-- comment -->
      text
      <div attr="foo bar">
        <div>foo</div>
      </div>`)
      container.children[0].click()
      value.should.equal(5)
      container.children[0].prop.should.equal(propValue)
    })
  })

  describe('update function', function () {
    let container

    beforeEach(function () {
      container = document.createElement('div')
      document.body.appendChild(container)
    })
    afterEach(function () {
      document.body.removeChild(container)
    })

    it('should update text nodes', function () {
      let instance = html`${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3`()
      container.appendChild(instance.content)
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('foobar bar foobar2 bar2 foobar3 bar3')
    })

    it('should update comment node', function () {
      let instance = html`<!-- ${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3 -->`()
      container.appendChild(instance.content)
      instance.update('foobar', 'foobar2', 'foobar3')
      container.innerHTML.should.equal('<!-- foobar bar foobar2 bar2 foobar3 bar3 -->')
    })

    it('should update element node', function () {
      let propValue = {}
      let instance = html`<${'div'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue}>${'text'}<div></div></${'div'}>`()
      container.appendChild(instance.content)
      let newPropValue = {}
      instance.update('span', 'tr2', 'foobar', 'op2', newPropValue, 'text2', 'span')
      container.innerHTML.should.equal('<span attr2="foo foobar">text2<div></div></span>')
      container.children[0].prop2.should.equal(newPropValue)
    })

    it('should update instance', function () {
      let instance = html`${html`<d${'iv'}>${'foo'}</di${'v'}>`}`()
      container.appendChild(instance.content)
      instance.update(html`<span>${'bar'}</sp${'an'}>`)
      container.innerHTML.should.equal('<span>bar</span>')
    })

    it('should update html', function () {
      let propValue = {}
      let value = 0
      let childDiv = html`<d${'iv'}>${'foo'}</di${'v'}>`
      // console.log('====')
      let instance = html`
      <!-- ${'comment'} -->
      ${'text'}
      <${'div'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue} ${'on'}-${'click'}=${_ => (value = 5)}>${'text'}${childDiv}</${'div'}>`()
      container.appendChild(instance.content)
      let newPropValue = {}
      container.children[0].click()
      value.should.equal(5)
      container.innerHTML.replace(/\s+/g, '').should.equal(`
      <!-- comment -->
      text
      <div attr="foo bar">
        text<div>foo</div>
        
      </div>`.replace(/\s+/g, ''))
      container.children[0].prop.should.equal(propValue)
      instance.update('comment2', 'text2', 'span', 'tr2', 'foobar', 'op2', newPropValue, 'on', 'focus', _ => (value = 10), 'text2', childDiv, 'span')
      container.innerHTML.replace(/\s+/g, '').should.equal(`
      <!-- comment2 -->
      text2
      <span attr2="foo foobar">
        text2<div>foo</div>
        
      </span>`.replace(/\s+/g, ''))
      value = 0
      container.children[0].contentEditable = 'true'
      container.children[0].focus()
      container.children[0].click()
      value.should.equal(10)
      container.children[0].prop2.should.equal(newPropValue)
    })
  })
})
