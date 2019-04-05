import { test, assert } from 'epk'
import { withHooks, useState, useEffect } from '../src/index'
import { isObservable } from 'rxjs'
import { take } from 'rxjs/operators'
import { map } from 'rxjs/operators';

test('is observable', () => {
  const obs = withHooks(() => true)
  assert(isObservable(obs))
  return obs
    |> take(1)
})

test('emit value returned', () =>
  withHooks(() => true)
  |> take(1)
  |> map(value => assert(value === true)))
