import { test, assert } from 'epk'
import { html } from '../src/index.ts'

test('is a function', () =>
  assert(typeof html === 'function'))

test('instanceof HTMLTemplateElement', () =>
  assert(html`` instanceof HTMLTemplateElement))
