import { test, assert } from 'epk'
import { withHooks, useState, useEffect } from '../src/index.ts'
import { isObservable } from 'rxjs'
import { take, map } from 'rxjs/operators'

test('is observable', () => {
  const obs = withHooks(() => true)
  assert(isObservable(obs))
  // @ts-ignore
  return obs
    // @ts-ignore
    |> take(1)
})

test('emit returned value', () =>
  // @ts-ignore
  withHooks(() => true)
  // @ts-ignore
  |> take(1)
  // @ts-ignore
  |> map(value => assert(value === true)))
