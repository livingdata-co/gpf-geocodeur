import test from 'ava'

import {ensureArray, extractIndexes} from '../index.js'

test('ensureArray', t => {
  t.deepEqual(ensureArray('value'), ['value'])
  t.deepEqual(ensureArray(['value']), ['value'])
  t.deepEqual(ensureArray(null), [])
  t.deepEqual(ensureArray(undefined), [])
})

test('extractIndexes', t => {
  t.deepEqual(extractIndexes('address'), ['address'])
  t.deepEqual(extractIndexes(['address']), ['address'])
  t.deepEqual(extractIndexes([]), ['address'])
  t.deepEqual(extractIndexes(undefined), ['address'])
  t.deepEqual(extractIndexes(['address', 'poi']), ['address', 'poi'])
  t.throws(() => extractIndexes('unknown'), {message: 'Unsupported index type: unknown'})
  t.throws(() => extractIndexes(['address', 'unknown']), {message: 'Unsupported index type: unknown'})
  t.deepEqual(extractIndexes(['address', 'poi', 'address']), ['address', 'poi'])
})
