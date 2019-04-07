import { test, assert } from 'epk'
import { withHooks, useState } from '../src/index.ts'
import { take, map, toArray } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useState === undefined))

test('make withHooks re-evaluate on setValue', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(true))

    return value
  })
  |> take(2)
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [false, true])))
