import { reactify, Reactivity } from '../src/index.js'
import * as chai from 'chai'
chai.should()
let expect = chai.expect
let assert = chai.assert

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
      isReactiveObject(react);
      ({...react})/* react */.should.deep.equal(original)
    })

    it('should build Maps and Sets', function () {
      let reactMap, reactSet
      expect(_ => (reactMap = reactify(new Map([['elem1', {foo: 'bar'}]])))).to.not.throw()
      expect(_ => (reactSet = reactify(new Set(['foo', 'bar'])))).to.not.throw()
      isReactiveObject(reactMap)
      isReactiveObject(reactSet);
      [...reactMap].should.deep.equal([...new Map([['elem1', {foo: 'bar'}]])]);
      [...reactSet].should.deep.equal([...new Set(['foo', 'bar'])])
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
        }
      })
    })
    afterEach(function () {
      react = null
    })

    it('should watch property change', function () {
      let val
      react.$watch(function () {
        return this.a
      }, newVal => (val = newVal))
      react.a = 8
      val.should.equal(8)
    })

    it('should watch getter change', function () {
      let val
      react.$watch(function () {
        return this.c
      }, newVal => (val = newVal))
      react.a = 8
      react.e = 1
      val.should.equal(10)
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
      expect(preB === react.b).to.equal(true)
      react.a = 2
      let postB = react.b
      expect(preB === postB).to.equal(false)
      expect(postB === react.b).to.equal(true)
    })
  })
})
