import { test, assert } from 'epk'
import { withHooks, useState, useEffect } from '../src/index.ts'
import { timer } from 'rxjs'
import { take, map, toArray, takeUntil } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useEffect === undefined))

test('is a function inside withHooks', () =>
  withHooks(() =>
    assert(typeof useEffect === 'function'))
  |> take(1))

test('always run if no second argument passed', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(0)

    useEffect(() => {
      if (value < 2) setTimeout(() => setValue(value + 1))
    })

    return value
  })
  |> takeUntil(timer(50))
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [0, 1, 2])))


test('only run if second argument is passed and has different values', () =>
  withHooks(() => {
    const [ effect1, setEffect1 ] = useState(0)
    const [ effect2, setEffect2 ] = useState(0)

    useEffect(() => {
      setEffect1(effect1 + 1)
    }, [])

    useEffect(() => {
      if (effect2 < 2) setEffect2(effect2 + 1)
    }, [effect2])

    return [effect1, effect2]
  })
  |> takeUntil(timer(50))
  |> toArray()
  |> map(values => assert.deepStrictEqual(values, [[0, 0], [1, 1], [1, 2]])))

test('call effects cleanup at hook unsubscription', async () => {
  let value

  withHooks(() => {
    useEffect(() => {
      return () => (value = 1)
    }, [])
  })
  .subscribe()
  .unsubscribe()

  await new Promise(setTimeout)

  assert(value === 1)
})
