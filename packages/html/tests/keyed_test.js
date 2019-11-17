import { test, assert } from 'epk'
import { html } from '../src/index.ts'

test('typeof function', () =>
  assert(typeof html(undefined) === 'function'))

test('returned function instanceof HTMLTemplateElement', () =>
  assert(html(undefined)`` instanceof HTMLTemplateElement))

test('sets HNKHTMLTemplateElement#key value to first argument', () =>
  assert(html('foo')``.key === 'foo'))
