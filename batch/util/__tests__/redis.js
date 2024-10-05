import test from 'ava'
import {readValue, writeValue, prepareObject, hydrateObject} from '../redis.js'

test('readValue', t => {
  t.is(readValue(), undefined)
  t.deepEqual(readValue('2022-01-01T00:00:00.000Z', 'date'), new Date('2022-01-01T00:00:00Z'))
  t.deepEqual(readValue('{"foo":"bar","toto":"tata"}', 'object'), {foo: 'bar', toto: 'tata'})
  t.is(readValue('1', 'integer'), 1)
  t.is(readValue('1.5', 'float'), 1.5)
  t.is(readValue('foo', 'string'), 'foo')
  t.is(readValue('true', 'boolean'), true)
})

test('writeValue', t => {
  t.is(writeValue(), undefined)
  t.is(writeValue(new Date('2022-01-01T00:00:00.000Z')), '2022-01-01T00:00:00.000Z')
  t.is(writeValue(33), '33')
  t.is(writeValue('foo'), 'foo')
  t.is(writeValue(true), 'true')
  t.is(writeValue({foo: 'bar'}), '{"foo":"bar"}')
})

test('prepareObject', t => {
  t.deepEqual(
    prepareObject({foo: 'bar', count: 7, empty: undefined}, {foo: 'string', count: 'integer'}),
    {foo: 'bar', count: '7'}
  )
})

test('hydrateObject', t => {
  t.deepEqual(
    hydrateObject({foo: 'bar', count: '7'}, {foo: 'string', count: 'integer'}),
    {foo: 'bar', count: 7}
  )
})
