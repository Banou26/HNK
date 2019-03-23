import { test, assert } from 'epk'
import { r } from '../src/index'

const object = {
  a: 1,
  b: 2,
  get c () {
    return this.a + this.b
  }
}

const getR = () => r(object)

test('reactify deepEqual', _ => {
  // assert([1, 2, 3].includes(4))
  assert.deepStrictEqual(getR(), object)
})
