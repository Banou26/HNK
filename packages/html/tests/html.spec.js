import { test, assert } from 'epk'
import { html } from '../src/index.ts'

test('is a function', () =>
  assert(typeof html === 'function'))

test('if used as template literal tag, instanceof HTMLTemplateElement', () =>
  assert(html`` instanceof HTMLTemplateElement))

test('if used as function, typeof function', () =>
  assert(typeof html() === 'function'))

test('if used as function, returned function instanceof HTMLTemplateElement', () =>
  assert(html()`` instanceof HTMLTemplateElement))

test('if used as function, sets HNKHTMLTemplateElement#key value to first argument', () =>
  assert(html('foo')``.key === 'foo'))
