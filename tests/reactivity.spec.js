import { reactify, Reactivity } from '../src/index.js'

describe.skip('reactify', function () {
  describe('proxy result', function () {
    const obj = {
      a: 1,
      b: 2,
      get c () {
        return this.a + this.b
      }
    }
    let react
    before(function () {
      react = reactify(obj)
    })
    it('is a copy', function () {
      expect(react).to.eql(obj)
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
  })
  describe('mutable', function () {

  })
  describe.skip('immutable', function () {

  })
})
