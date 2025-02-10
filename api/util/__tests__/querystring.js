import test from 'ava'
import {normalizeQuery, ensureSingleValue, isArrayOfStrings} from '../querystring.js'

test('ensureSingleValue', t => {
  t.is(ensureSingleValue(['foo', 'bar', 'baz']), 'baz')
  t.is(ensureSingleValue(['foo']), 'foo')
  t.is(ensureSingleValue('bar'), 'bar')
})

test('normalizeQuery', t => {
  t.deepEqual(normalizeQuery({
    mixed: {foo: 'bar'},
    FOO: ['a', 'b', 'c'],
    Bar: '1',
    ' plop ': ['X', 'Y']
  }), {
    FOO: 'c',
    Bar: '1',
    plop: 'Y'
  })
})

test('isArrayOfStrings', t => {
  t.true(isArrayOfStrings(['foo', 'bar', 'baz']))
  t.false(isArrayOfStrings(['foo', 'bar', 1]))
  t.false(isArrayOfStrings('foo'))
})
