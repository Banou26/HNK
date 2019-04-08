import { test, assert } from 'epk'
import { withHooks, useState } from '../src/index.ts'
import { timer } from 'rxjs'
import { take, map, toArray, takeUntil } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useState === undefined))

test('is a function inside withHooks', () =>
  withHooks(() =>
    assert(typeof useState === 'function'))
  |> take(1))

test('withHooks evaluation on setValue', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(true))

    return value
  })
  |> takeUntil(timer(50))
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [false, true])))

test('withHooks shouldn\'t evaluate when setValue is called with the same value', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(false))

    return value
  })
  |> takeUntil(timer(50))
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [false])))
