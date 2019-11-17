import { test, assert } from 'epk'
import { html } from '../src/index.ts'

test('is a function', () =>
  assert(typeof html === 'function'))

test('instanceof HTMLTemplateElement', () =>
  assert(html`` instanceof HTMLTemplateElement))

// todo: Refactor these tests with EPK snapshots when they land
test(`has innerHTML undefined if template hasn't been initiated`, () =>
  assert(html`foo <div> bar </div> bar`.innerHTML === ''))

test(`isn't initialized by default`, () =>
  assert(html`foo <div> bar </div> bar`.init === false))

test(`isn't initialized by default`, () =>
  assert.deepStrictEqual(html`${'foo'}${'bar'}${'baz'}`.values, ['foo', 'bar', 'baz']))

test('has innerHTML corresponding to template if template has been initiated', () => {
  const template = html`foo <div> bar </div> bar`
  template.init()
  assert(template.innerHTML === 'foo <div> bar </div> bar')
})
