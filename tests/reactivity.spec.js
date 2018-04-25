import { reactify, Reactivity, watch, reactivitySymbol } from '../src/index.js'

const isProxyResult = function (object) {
  let react
  before(function () {
    react = reactify(object)
  })
  it('is a copy', function () {
    expect(react).to.eql(object)
  })
  describe('#$watch()', function () {
    it('is defined', function () {
      expect(typeof react.$watch).to.equal('function')
    })
  })
  describe('#__reactivity__', function () {
    it('instance of Reactivity', function () {
      // expect(react).to.instanceOf(Reactivity)
      expect(!!react[reactivitySymbol]).to.equal(true)
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
    describe('watch', function () {
      let react
      beforeEach(function () {
        react = reactify({
          a: 1,
          b: 2,
          get c () {
            return this.a + this.b
          },
          someMap: new Map(),
          get d () {
            return this.someMap
          }
        })
      })
      describe('#$watch()', function () {
        it('return watched object value to the watcher function', function () {
          let object
          react.$watch(obj => (object = obj))
          react.b = 3
          expect(object).to.equal(react)
        })
        it('return watched property value to the watcher function', function () {
          let property
          react.$watch(_ => react.c, prop => (property = prop))
          react.b = 3
          expect(property).to.equal(react.c)
        })
        it('return an unwatch function', function () {
          let i = 0
          const unwatch = react.$watch(obj => i++)
          react.b = 3
          expect(i).to.equal(1)
          unwatch()
          react.b = 4
          expect(i).to.equal(1)
        })
        it('watch a built-in object', function () {
          let map
          react.someMap.$watch(_map => (map = _map))
          react.someMap.set('a', 1)
          expect(map).to.equal(react.someMap)
        })
      })
      describe('#watch()', function () {
        it('return watched object value to the watcher function', function () {
          let object
          watch(_ => react, obj => (object = obj))
          react.b = 3
          expect(object).to.equal(react)
        })
        it('return watched property value to the watcher function', function () {
          let property
          watch(_ => react.c, prop => (property = prop))
          react.b = 3
          expect(property).to.equal(react.c)
        })
        it('return an unwatch function', function () {
          let i = 0
          const unwatch = watch(_ => react, obj => i++)
          expect(i).to.equal(0)
          react.b = 3
          expect(i).to.equal(1)
          unwatch()
          react.b = 4
          expect(i).to.equal(1)
        })
        it('watch a built-in object', function () {
          let map
          watch(_ => react.someMap, _map => (map = _map))
          react.someMap.set('a', 1)
          expect(map).to.equal(react.someMap)
        })
      })
    })
  })
  describe.skip('immutable', function () {

  })
})
