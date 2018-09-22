import { Router, html, css, registerElement, OzElement, OzElementContext, reactivity } from '../../src/index.js'

const originalURL = window.location.pathname

const usedTags = []

const tagName = (name, tag = `${name || 'foo'}-${Math.random().toString(36).substring(7)}`) =>
  usedTags.includes(tag)
    ? tagName(name)
    : usedTags.push(tag) && tag

const getRand = _ => Math.random().toString(36).substring(7)

const getPathName = _ => window.location.pathname

describe('Router', () => {
  let container, router, view, Foo, Bar, Baz, Qux
  beforeEach(() => {
    document.body.appendChild(container = document.createElement('div'))
    Foo = registerElement({ name: tagName() })
    Bar = registerElement({ name: tagName('bar') })
    Baz = registerElement({ name: tagName('baz') })
    Qux = registerElement({ name: tagName('qux') })
    router = Router({
      routes: [
        {
          path: '/foo/:child',
          content: Foo,
          children: [
            {
              path: 'bar',
              content: Bar
            },
            {
              path: 'baz',
              content: Baz
            },
            {
              path: '',
              content: Qux
            }
          ]
        }
      ]
    })
    view = document.createElement('router-view')
    view[OzElementContext].router = router
    container.appendChild(view)
  })
  afterEach(() => container.remove() || window.history.replaceState({}, '', originalURL))
  it('is a function', () => {
    expect(typeof Router).to.equal('function')
  })
  it('return reactive router object', () => {
    expect(Router()).to.have.property(reactivity)
  })
  describe('#replace', () => {
    it('is defined', () => expect(router).to.have.property('replace'))
    fit('push the url to the history', () => {
      const rand = getRand()
      router.push(`/${rand}`)
      expect(getPathName()).to.equal(`/${rand}`)
    })
  })
  describe('#replace', () => {
    it('is defined', () => expect(router).to.have.property('replace'))
    it('replace the current history url', () => {
      const rand = getRand()
      router.replace(`/${rand}`)
      expect(getPathName()).to.equal(`/${rand}`)
    })
  })
})
