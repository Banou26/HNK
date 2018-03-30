import { reactify, Reactivity } from '../src/index.js'

const isProxyResult = function (object) {
  let react
  before(function () {
    react = reactify(object)
  })
  it('is a copy', function () {
    expect(react).to.eql(object)
  })
  describe('#watch()', function () {
    it('is defined', function () {
      expect(typeof react.$watch).to.equal('function')
    })
  })
  describe('#__reactivity__', function () {
    it('instance of Reactivity', function () {
      expect(react.__reactivity__).to.instanceOf(Reactivity)
    })
  })
}

describe('reactify', function () {
  describe('proxy result', function () {
    const map = new Map()
    const object = {
      a: 1,
      b: 2,
      get c () {
        return this.a + this.b
      },
      map
    }
    map.set(0, object)
    map.set(1, map)
    const array = [map, object]

    describe('object', isProxyResult.bind(null, object))
    describe('map', isProxyResult.bind(null, map))
    describe('array', isProxyResult.bind(null, array))
  })
  describe('mutable', function () {

  })
  describe.skip('immutable', function () {

  })
})
