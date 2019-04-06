import { test, assert } from 'epk'
import { withHooks, useState } from '../src/index'
import { take, map, toArray } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useState === undefined))

test('throws if outside of withHooks', () =>
  assert.throws(() =>
    useState()))

test('make withHooks re-evaluate on setValue', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(true), 10)

    return value
  })
  |> take(2)
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [false, true])))
