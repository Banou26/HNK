import { reactify, Reactivity, watch } from '../src/index.js'
import * as chai from 'chai'
chai.should()
let expect = chai.expect

const isReactiveObject = obj => obj instanceof Reactivity

describe('Reactivity', _ => {
  describe('build', function () {
    it('should build a reactive copy of the original object', function () {
      let original = {
        a: 1,
        b: 2,
        get c () {
          return this.a + this.b
        }
      }
      let react
      expect(_ => (react = reactify(original))).to.not.throw()
      isReactiveObject(react)
      expect(react).to.deep.equal(original)
    })

    it('should build Maps and Sets', function () {
      let reactMap, reactSet
      expect(_ => (reactMap = reactify(new Map([['elem1', {foo: 'bar'}]])))).to.not.throw()
      expect(_ => (reactSet = reactify(new Set(['foo', 'bar'])))).to.not.throw()
      isReactiveObject(reactMap)
      isReactiveObject(reactSet)
      expect(reactMap).to.deep.equal(new Map([['elem1', {foo: 'bar'}]]))
      expect(reactSet).to.deep.equal(new Set(['foo', 'bar']))
    })
  })
  describe('watch', function () {
    let react

    beforeEach(function () {
      react = reactify({
        a: 1,
        b: 2,
        get c () {
          return this.a + this.b
        },
        get d () {
          return {
            a: this.a,
            b: this.b,
            c: this.c
          }
        },
        get e () {
          return this.c
        },
        f: {
          g: 5,
          h: 10
        }
      })
    })
    afterEach(function () {
      react = null
    })

    it('should watch property change', function () {
      let val
      react.$watch(_ => react.a, newVal => (val = newVal))
      react.a = 8
      expect(val).to.equal(8)
    })

    it('should watch object change', function () {
      let val
      react.$watch(newVal => (val = newVal))
      react.a = 5
      expect(val).to.equal(react)
    })

    it('should watch getter change', function () {
      let val
      react.$watch(_ => react.c, newVal => (val = newVal))
      react.a = 8
      expect(val).to.equal(10)
    })

    // it('should watch deep change', function () {
    //   let val
    //   react.$watch(newVal => (val = newVal))
    //   react.f.g = 2
    //   console.log(val)
    //   expect(val).to.equal(4)
    // })

    it('should watch deep dependency', function () {
      let val
      let react2 = reactify({
        get a () {
          return react.e
        }
      })
      let react3 = reactify({
        get b () {
          return react2.a
        }
      })
      react3.$watch(_ => react3.b, newVal => (val = newVal))
      react.a = 2
      expect(val).to.equal(4)
    })

    it('should watch new properties', function () {
      let val, val2
      react.$watch(newVal => (val = newVal))
      react.$watch(_ => react.z, newVal => (val2 = newVal))
      react.z = 9
      expect(val.z).to.equal(9)
      expect(val2).to.equal(9)
    })

    it('should not reactify a reactive object', function () {
      let obj = reactify({})
      let react = reactify({obj})
      expect(obj).to.equal(react.obj)
    })

    it('should have a optional handler in the standalone function', function () {
      let a, b, c
      let react = reactify({
        a: 1,
        b: 2,
        get c () {
          return this.a + this.b
        }
      })
      watch(_ => {
        if (b) c = react.c
        else if (a) b = react.c
        else a = react.c
      })
      expect(a).to.equal(3)
      react.a = 3
      expect(b).to.equal(5)
      react.b = 10
      expect(c).to.equal(13)
    })

    it('should behave the same with multiple watchers', function () {
      let c, c2
      watch(_ => (c = react.c))
      watch(_ => (c2 = react.c))
      react.a = 3
      expect(c).to.equal(5)
      expect(c2).to.equal(5)
    })
  })
  describe('getter', function () {
    it('should cache the value', function () {
      let react = reactify({
        a: 1,
        get b () {
          return {
            a: this.a
          }
        }
      })
      let preB = react.b
      expect(preB).to.equal(react.b)
      react.a = 2
      let postB = react.b
      expect(preB).to.not.equal(postB)
      expect(postB).to.equal(react.b)
    })
  })
  describe('setter', function () {
    it('should set reactive object without changing it', function () {
      let react = reactify({
        a: 1,
        b: 2,
        get c () {
          return this.a + this.b
        }
      })
      let react2 = reactify({
        get a () {
          return react.c
        }
      })
      react.d = react2
      expect(react.d).to.equal(react2)
    })
  })
})
