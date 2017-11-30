import { reactify } from '../src/index.js'
import * as chai from 'chai'
chai.should()
let expect = chai.expect
let assert = chai.assert

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
      react.should.have.property('$watch')
      react.should.have.property('__reactivity__')
      react.should.deep.equal(original)
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
      val.should.equal(10)
    })
  })
  describe('getter', function () {
    it('should cache the value', function () {
      let react = reactify({
        get b () {
          return {}
        }
      })
      let b = react.b
      react.should.have.property('b').equal(b)
    })
  })
})
