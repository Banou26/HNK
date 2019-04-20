import { test, assert } from 'epk'
import { withHooks, useState } from '../src/index.ts'
import { timer } from 'rxjs'
import { take, map, toArray, takeUntil } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useState === undefined))

test('is a function inside withHooks', () =>
  // @ts-ignore
  withHooks(() =>
    assert(typeof useState === 'function'))
  // @ts-ignore
  |> take(1))

test('withHooks evaluation on setValue', () =>
  // @ts-ignore
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(true))

    return value
  })
  // @ts-ignore
  |> takeUntil(timer(50))
  // @ts-ignore
  |> toArray()
  // @ts-ignore
  |> map(values => assert.deepStrictEqual(values, [false, true])))

test('useState returns a direct value and a getValue function', () =>
  // @ts-ignore
  withHooks(() => {
    const [ value, setValue, getValue ] = useState(false)

    if (!value) setTimeout(() => setValue(true))

    return [value, getValue()]
  })
  // @ts-ignore
  |> takeUntil(timer(50))
  // @ts-ignore
  |> toArray()
  // @ts-ignore
  |> map(values => assert.deepStrictEqual(values, [[false, false], [true, true]])))

test('withHooks shouldn\'t evaluate when setValue is called with the same value', () =>
  // @ts-ignore
  withHooks(() => {
    const [ value, setValue ] = useState(false)

    if (!value) setTimeout(() => setValue(false))

    return value
  })
  // @ts-ignore
  |> takeUntil(timer(50))
  // @ts-ignore
  |> toArray()
  // @ts-ignore
  |> map(values => assert.deepStrictEqual(values, [false])))
