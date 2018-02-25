import { html, poz } from '../src/index.js'

const structureTests = build => {
  let template
  before(function () {
    template = html`<element>a${''}b${1}c</element>`
    if (!build) template = template()
  })
  after(function () {
    template = null
  })
  describe('#build', function () {
    it('is true', function () {
      expect(template[build ? 'build' : 'instance']).to.equal(true)
    })
  })
  describe('#id', function () {
    it('is equal the template content with placeholders', function () {
      const match = template.id.match(/<element>(.*)<\/element>/)
      expect(match).to.not.equal(null)
      expect(match[1]).to.not.equal('')
      expect(match[0].replace(match[1], '')).to.equal('<element></element>')
    })
  })
  describe('#values', function () {
    it('is equal the template placeholder values', function () {
      expect(template.values).to.eql(['', 1])
    })
  })
}

describe('html', function () {
  describe('build', function () {
    structureTests(true)
  })
  describe('instance', function () {
    structureTests(false)
  })
  describe('tag placeholder', function () {
    let instance
    before(function () {
      instance = html`<${'div'} staticAttribute="staticValue" ${'dynamicAttribute'}="${'dynamicValue'}"></${'div'}>`()
    })
    it('create a div', function () {
      const node = instance.childNodes[0]
      expect(node.getAttribute('staticAttribute')).to.equal('staticValue')
      expect(node.getAttribute('dynamicAttribute')).to.equal('dynamicValue')
      expect(node).to.instanceof(HTMLDivElement)
    })
    it('replace the div with a span', function () {
      instance.update('span', 'anotherDynamicAttribute', 'anotherDynamicValue', 'span')
      const node = instance.childNodes[0]
      expect(node.getAttribute('staticAttribute')).to.equal('staticValue')
      expect(node.getAttribute('anotherDynamicAttribute')).to.equal('anotherDynamicValue')
      expect(instance.childNodes[0]).to.instanceof(HTMLSpanElement)
    })
  })
  describe('comment placeholder', function () {
    let instance
    before(function () {
      instance = html`<!-- ${'comment'} -->`()
    })
    it('create a comment node', function () {
      const node = instance.childNodes[0]
      expect(node).to.instanceOf(Comment)
      expect(node.nodeValue).to.equal(' comment ')
    })
    it('replace the comment text by some other text', function () {
      const node = instance.childNodes[0]
      instance.update('some other comment text')
      expect(node.nodeValue).to.equal(' some other comment text ')
    })
  })
  describe('attribute placeholder', function () {
    let instance
    before(function () {
      instance = html`<div ${'attribute'}="${'value'}" ${'attribute2'}='${'value2'}' ${'property'}=${'value3'}></div>`()
    })
    it('create a div with attributes and properties', function () {
      const node = instance.childNodes[0]
      expect(node.getAttribute('attribute')).to.equal('value')
      expect(node.getAttribute('attribute2')).to.equal('value2')
      expect(node['property']).to.equal('value3')
    })
    it('replace the div attributes and properties by other attributes and properties', function () {
      const node = instance.childNodes[0]
      instance.update('anotherAttribute', 'anotherValue', 'anotherAttribute2', 'anotherValue2', 'anotherProperty3', 'anotherValue3')
      expect(node.getAttribute('attribute')).to.equal(null)
      expect(node.getAttribute('attribute2')).to.equal(null)
      expect(node['property']).to.equal('value3')
      expect(node.getAttribute('anotherAttribute')).to.equal('anotherValue')
      expect(node.getAttribute('anotherAttribute2')).to.equal('anotherValue2')
      expect(node['anotherProperty3']).to.equal('anotherValue3')
    })
  })
  describe('text placeholder', function () {
    describe('string', function () {
      let instance
      before(function () {
        instance = html`${'text'}`()
      })
      it('create a text node', function () {
        const textNode = instance.childNodes[0]
        expect(textNode).to.instanceof(Text)
        expect(textNode.nodeValue).to.equal('text')
      })
      it('create a span and replace the div', function () {
        const textNode = instance.childNodes[0]
        instance.update('some other text')
        expect(textNode.nodeValue).to.equal('some other text')
      })
    })
    describe('node', function () {
      let instance
      before(function () {
        instance = html`${document.createElement('div')}`()
      })
      it('create a div', function () {
        const node = instance.childNodes[0]
        expect(node).to.equal(instance.values[0])
      })
      it('replace a div with a span', function () {
        const newNode = document.createElement('span')
        instance.update(newNode)
        expect(instance.childNodes[0]).to.equal(newNode)
      })
    })
    describe('template', function () {
      let instance
      const subTemplate = text => html`some ${text} template`
      const subTemplate2 = text => html`some other ${text} sub template`
      before(function () {
        instance = html`${subTemplate('text')}`()
      })
      it('create a template instance', function () {
        const node = instance.childNodes[1]
        expect(node).to.instanceof(Text)
        expect(node.nodeValue).to.equal('text')
        expect(instance.childNodes[0].nodeValue).to.equal('some ')
        expect(instance.childNodes[2].nodeValue).to.equal(' template')
      })
      it('update the template instance', function () {
        instance.update(subTemplate('another text'))
        const node = instance.childNodes[1]
        expect(node).to.instanceof(Text)
        expect(node.nodeValue).to.equal('another text')
        expect(instance.childNodes[0].nodeValue).to.equal('some ')
        expect(instance.childNodes[2].nodeValue).to.equal(' template')
      })
      it('replace the template instance', function () {
        instance.update(subTemplate2('some new other text'))
        const node = instance.childNodes[1]
        expect(node).to.instanceof(Text)
        expect(node.nodeValue).to.equal('some new other text')
        expect(instance.childNodes[0].nodeValue).to.equal('some other ')
        expect(instance.childNodes[2].nodeValue).to.equal(' sub template')
      })
    })
  })

  describe('poz', function () {
    it('should work', function () {
      const instance = poz`div`()
      expect(instance.childNodes[0]).to.instanceOf(HTMLDivElement)
    })
  })
})
