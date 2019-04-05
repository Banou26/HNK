import { test, assert } from 'epk'
import { withHooks, useState, useEffect } from '../src/index'
import { isObservable } from 'rxjs'
import { take } from 'rxjs/operators'

test('is undefined outside of withHooks', () =>
  assert(useState === undefined))

test('throws if outside of withHooks', () =>
  assert.throws(() =>
    useState()))


test('make withHooks re-evaluate', () =>
  withHooks(() => {
    const [ value, setValue ] = useState(true)

    

    return value
  })
  |> take(2)
  |> map(value => {

  }))
