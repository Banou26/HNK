import { test, assert } from 'epk'
import { react, watch } from '../../../dist/index.js'
import { of } from 'rxjs'
import { delay } from 'rxjs/operators'

const r = react({
  foo: 1,
  bar: 2,
  get baz () {
    return this.foo + this.bar
  },
  qux: () => r.foo + r.bar
})

test('asynchronous watch', async _ => {
  let foo, foo2, bar, bar2, baz, baz2
  watch(async function * () {
    const _foo = yield (of(foo = r.foo) |> delay(100)).toPromise()
    foo2 = _foo
    const _bar = yield (of(bar = r.bar) |> delay(100)).toPromise()
    bar2 = _bar
    return baz = r.baz
  }).subscribe(({ value }) => (baz2 = value))

  assert(foo === 1)

  await (of(true) |> delay(100)).toPromise()
  assert(foo2 === 1)
  assert(bar === 2)

  await (of(true) |> delay(100)).toPromise()
  assert(bar2 === 2)
  assert(baz === 3)
  assert(baz2 === 3)
})

test('asynchronous watch unsubscribe', async _ => {
  let foo, foo2, bar, bar2, baz, baz2, unsub, unsub2, unsub3
  watch(async function * (ctx) {
    unsub = ctx.unsubscribed
    const _foo = yield (of(foo = r.foo) |> delay(100)).toPromise()
    foo2 = _foo
    unsub2 = ctx.unsubscribed
    const _bar = yield (of(bar = r.bar) |> delay(100)).toPromise()
    bar2 = _bar
    unsub3 = ctx.unsubscribed
    return baz = r.baz
  })
    .subscribe(({ value }) => (baz2 = value))
    .unsubscribe()

  assert(unsub === false)
  assert(foo === 1)

  await (of(true) |> delay(100)).toPromise()
  assert(unsub2 === true)
  assert(foo2 === 1)
  assert(bar === 2)

  await (of(true) |> delay(100)).toPromise()
  assert(unsub3 === true)
  assert(bar2 === 2)
  assert(baz === 3)
  assert(baz2 === 3)
})

test('asynchronous watch unsubscribe at rerun', async _ => {
  let foo, foo2, bar, bar2, baz, baz2, unsub, unsub2, unsub3
  watch(async function * (ctx) {
    unsub = ctx.unsubscribed
    const _foo = yield (of(foo = r.foo) |> delay(100)).toPromise()
    foo2 = _foo
    unsub2 = ctx.unsubscribed
    const _bar = yield (of(bar = r.bar) |> delay(100)).toPromise()
    bar2 = _bar
    unsub3 = ctx.unsubscribed
    return baz = r.baz
  }).subscribe(({ value }) => (baz2 = value))

  assert(unsub === false)
  assert(foo === 1)

  await (of(true) |> delay(100)).toPromise()
  assert(unsub2 === false)
  assert(foo2 === 1)
  assert(bar === 2)

  r.bar = 4

  await (of(true) |> delay(100)).toPromise()
  assert(unsub3 === true)
  assert(bar2 === 2)
  assert(baz === 5)
  assert(baz2 === 5)

  assert(unsub2 === false)
  assert(foo2 === 1)
  assert(bar === 4)

  await (of(true) |> delay(100)).toPromise()
  assert(unsub3 === false)
  assert(bar2 === 2)
  assert(baz === 5)
  assert(baz2 === 5)
})