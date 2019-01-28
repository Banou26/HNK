import { test, assert } from 'epk'
import { react, watch } from '../../../dist/index.js'

const r = react({
  foo: 1,
  bar: 2,
  get baz () {
    return this.foo + this.bar
  },
  qux: () => r.foo + r.bar
})

test('set property', _ => {
  r.foo = 3
  assert(r.foo === 3)
})

test('delete property', _ => {
  delete r.foo
  assert(r.foo === undefined)
})

test('watch property changes', _ => {
  let _value
  let i = 0
  watch(r, 'foo')
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === 1)
  r.foo = 3
  assert(i === 2)
  assert(_value === 3)
})

test('watch property changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(r, 'foo')
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === 1)
  r.foo = 3
  assert(i === 1)
  assert(_value === 1)
})

test('watch function property changes', _ => {
  let _value
  let i = 0
  watch(_ => r.foo)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === 1)
  r.foo = 3
  assert(i === 2)
  assert(_value === 3)
})

test('watch function property changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(_ => r.foo)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === 1)
  r.foo = 3
  assert(i === 1)
  assert(_value === 1)
})

test('watch changes', _ => {
  let _value
  let i = 0
  watch(r)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === r)
  r.foo = 3
  assert(i === 2)
  assert(_value === r)
})

test('watch changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(r)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === r)
  r.foo = 3
  assert(i === 1)
  assert(_value === r)
})

test('watch function return changes', _ => {
  let _value
  let i = 0
  watch(_ => r)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === r)
  r.foo = 3
  assert(i === 2)
  assert(_value === r)
})

test('watch function return changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(_ => r)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === r)
  r.foo = 3
  assert(i === 2)
  assert(_value === r)
})

test('watch getter changes', _ => {
  let _value
  let i = 0
  watch(r, 'baz')
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === 3)
  r.foo = 3
  assert(i === 2)
  assert(_value === 5)
})

test('watch getter changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(r, 'baz')
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === 3)
  r.foo = 3
  assert(i === 1)
  assert(_value === 3)
})

test('watch function getter changes', _ => {
  let _value
  let i = 0
  watch(_ => r.baz)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
  assert(i === 1)
  assert(_value === 3)
  r.foo = 3
  assert(i === 2)
  assert(_value === 5)
})

test('watch function getter changes unsubscribe', _ => {
  let _value
  let i = 0
  watch(_ => r.baz)
    .subscribe(({ value }) => {
      _value = value
      i++
    })
    .unsubscribe()
  assert(i === 1)
  assert(_value === 3)
  r.foo = 3
  assert(i === 1)
  assert(_value === 3)
})

test('getter only run when dependencies changed', _ => {
  let ran = 0
  r.baz = function () {
    ran++
    return this.foo + this.bar
  }
  assert(r.baz === 3)
  assert(ran === 0)

  assert(r.baz === 3)
  assert(ran === 1)

  assert(r.baz === 3)
  assert(ran === 1)

  r.foo = 1

  assert(r.baz === 3)
  assert(ran === 1)

  r.foo = 3

  assert(r.baz === 5)
  assert(ran === 2)
})
