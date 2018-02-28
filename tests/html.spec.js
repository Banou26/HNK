import { html, poz } from '../src/index.js'

const testChildNode = arr => (n, func, cb) => arr().map(item => cb(expect(func(item.childNodes[n]))))

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
    let instance, container
    before(function () {
      instance = html`<${'div'} staticAttribute="staticValue" ${'dynamicAttribute'}="${'dynamicValue'}"></${'div'}>`()
      container = document.createElement('div')
      container.appendChild(instance.content)
      document.body.appendChild(container)
    })
    after(function () {
      document.body.removeChild(container)
    })
    const test = testChildNode(_ => ([instance, container]))

    it('create a div', function () {
      test(0, node => node.getAttribute('staticAttribute'), expect => expect.to.equal('staticValue'))
      test(0, node => node.getAttribute('dynamicAttribute'), expect => expect.to.equal('dynamicValue'))
      test(0, node => node, expect => expect.to.instanceOf(HTMLDivElement))
    })
    it('replace the div with a span', function () {
      instance.update('span', 'anotherDynamicAttribute', 'anotherDynamicValue', 'span')
      test(0, node => node.getAttribute('staticAttribute'), expect => expect.to.equal('staticValue'))
      test(0, node => node.getAttribute('anotherDynamicAttribute'), expect => expect.to.equal('anotherDynamicValue'))
      test(0, node => node, expect => expect.to.instanceOf(HTMLSpanElement))
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
    let instance, container
    before(function () {
      instance = html`<div ${'attribute'}="${'value'}" ${'attribute2'}='${'value2'}' ${'property'}=${'value3'}></div>`()
      container = document.createElement('div')
      container.appendChild(instance.content)
      document.body.appendChild(container)
    })
    after(function () {
      document.body.removeChild(container)
    })
    const test = testChildNode(_ => ([instance, container]))

    it('create a div with attributes and properties', function () {
      test(0, node => node.getAttribute('attribute'), expect => expect.to.equal('value'))
      test(0, node => node.getAttribute('attribute2'), expect => expect.to.equal('value2'))
      test(0, node => node.property, expect => expect.to.equal('value3'))
    })
    it('replace the div attributes and properties by other attributes and properties', function () {
      instance.update('anotherAttribute', 'anotherValue', 'anotherAttribute2', 'anotherValue2', 'anotherProperty3', 'anotherValue3')
      test(0, node => node.getAttribute('attribute'), expect => expect.to.equal(null))
      test(0, node => node.getAttribute('attribute2'), expect => expect.to.equal(null))
      test(0, node => node.property, expect => expect.to.equal('value3'))
      test(0, node => node.getAttribute('anotherAttribute'), expect => expect.to.equal('anotherValue'))
      test(0, node => node.getAttribute('anotherAttribute2'), expect => expect.to.equal('anotherValue2'))
      test(0, node => node.anotherProperty3, expect => expect.to.equal('anotherValue3'))
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
      let instance, container
      const subTemplate = text => html`some ${text} template`
      const subTemplate2 = text => html`some other ${text} sub template`

      before(function () {
        instance = html`${subTemplate('text')}`()
        container = document.createElement('div')
        container.appendChild(instance.content)
        document.body.appendChild(container)
      })
      after(function () {
        document.body.removeChild(container)
      })
      const test = testChildNode(_ => ([instance, container]))
      const testValue = (n, val) => test(n, node => node.nodeValue, expect => expect.to.equal(val))

      it('create a template instance', function () {
        testValue(0, 'some ')
        test(1, node => node, expect => expect.to.instanceOf(Text))
        testValue(1, 'text')
        testValue(2, ' template')
      })
      it('update the template instance', function () {
        instance.update(subTemplate('another text'))
        testValue(0, 'some ')
        test(1, node => node, expect => expect.to.instanceOf(Text))
        testValue(1, 'another text')
        testValue(2, ' template')
      })
      it('replace the template instance', function () {
        instance.update(subTemplate2('some new other text'))
        testValue(0, 'some other ')
        test(1, node => node, expect => expect.to.instanceOf(Text))
        testValue(1, 'some new other text')
        testValue(2, ' sub template')
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
