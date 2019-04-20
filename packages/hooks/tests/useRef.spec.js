import { timer } from 'rxjs'
import { test, assert } from 'epk'
import { take, toArray, takeUntil, tap } from 'rxjs/operators'

import { withHooks, useRef } from '../src/index.ts'

test('is undefined outside of withHooks', () =>
  assert(useRef === undefined))

test('is a function inside withHooks', () =>
  // @ts-ignore
  withHooks(() =>
    assert(typeof useRef === 'function'))
  // @ts-ignore
  |> take(1))

test('return mutable object with initial value as current property', () =>
  // @ts-ignore
  withHooks(() => {
    const ref = useRef(false)

    setTimeout(() => (ref.current = true))

    return ref
  })
  // @ts-ignore
  |> tap(value => assert.deepStrictEqual(value, { current: false }))
  // @ts-ignore
  |> takeUntil(timer(50))
  // @ts-ignore
  |> toArray()
  // @ts-ignore
  |> tap(values => assert.deepStrictEqual(values, [{ current: true }])))
