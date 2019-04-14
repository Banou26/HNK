import { timer } from 'rxjs'
import { test, assert } from 'epk'
import { take, toArray, takeUntil, tap } from 'rxjs/operators'

import { withHooks, useRef } from '../src/index.ts'

test('is undefined outside of withHooks', () =>
  assert(useRef === undefined))

test('is a function inside withHooks', () =>
  withHooks(() =>
    assert(typeof useRef === 'function'))
  |> take(1))

test('return mutable object with initial value as current property', () =>
  withHooks(() => {
    const ref = useRef(false)

    setTimeout(() => (ref.current = true))

    return ref
  })
  |> tap(value => assert.deepStrictEqual(value, { current: false }))
  |> takeUntil(timer(50))
  |> toArray()
  |> tap(values => assert.deepStrictEqual(values, [{ current: true }])))
