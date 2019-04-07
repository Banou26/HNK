import { test, assert } from 'epk'
import { withHooks, useState, useEffect } from '../src/index.ts'
import { take, map, toArray } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useEffect === undefined))

test('run on every withHooks run if no second argument passed', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(0)

    useEffect(() => {
      if (value < 2) setTimeout(() => setValue(value + 1))
    })

    return value
  })
  |> take(3)
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [0, 1, 2])))


  test('run on first withHooks run if empty array passed as second argument', () =>
    withHooks(() => {
      const [ value, setValue ] = useState(0)

      useEffect(() => {
        if (value <= 2) setTimeout(() => setValue(value + 1))
      }, [])

      return value
    })
    |> take(2)
    |> toArray()
    |> map(values => assert.deepStrictEqual(values, [0, 1])))