import test from 'ava'
import {getLon, getLat, isFirstCharValid, prepareParams} from '../params.js'

test('getLon with fieldName', t => {
  const item = {customField: '12.34'}
  const fieldName = 'customField'
  t.is(getLon(item, fieldName), 12.34)
})

test('getLon with longitude field', t => {
  const item = {longitude: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with lon field', t => {
  const item = {lon: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with lng field', t => {
  const item = {lng: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with long field', t => {
  const item = {long: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with no matching field', t => {
  const item = {otherField: '12.34'}
  t.is(getLon(item), undefined)
})

test('getLat with fieldName', t => {
  const item = {customField: '56.78'}
  const fieldName = 'customField'
  t.is(getLat(item, fieldName), 56.78)
})

test('getLat with latitude field', t => {
  const item = {latitude: '56.78'}
  t.is(getLat(item), 56.78)
})

test('getLat with lat field', t => {
  const item = {lat: '56.78'}
  t.is(getLat(item), 56.78)
})

test('getLat with no matching field', t => {
  const item = {otherField: '56.78'}
  t.is(getLat(item), undefined)
})

test('isFirstCharValid', t => {
  t.true(isFirstCharValid('a'))
  t.true(isFirstCharValid('A'))
  t.true(isFirstCharValid('1'))
  t.true(isFirstCharValid('é'))

  t.false(isFirstCharValid(' '))
  t.false(isFirstCharValid(''))
  t.false(isFirstCharValid('!'))
})

test('prepareParams - forward geocoding with columns', t => {
  const item = {street: '123 Main St', city: 'Anytown'}
  const options = {
    reverse: false,
    columns: ['housenumber', 'street', 'city'],
    citycode: null,
    postcode: null,
    lat: null,
    lon: null
  }
  const expected = {q: '123 Main St Anytown', filters: {}}
  t.deepEqual(prepareParams(item, options), expected)
})

test('prepareParams - forward geocoding with citycode and postcode', t => {
  const item = {q: '2 allée des peupliers', citycode: '12345', postcode: '67890'}
  const options = {
    reverse: false,
    columns: ['q'],
    citycode: 'citycode',
    postcode: 'postcode',
    lat: null,
    lon: null
  }
  const expected = {
    filters: {citycode: '12345', postcode: '67890'},
    q: '2 allée des peupliers'
  }
  t.deepEqual(prepareParams(item, options), expected)
})

test('prepareParams - reverse geocoding', t => {
  const item = {latitude: '40.7128', longitude: '-74.0060'}
  const options = {
    reverse: true,
    columns: null,
    citycode: null,
    postcode: null,
    lat: 'latitude',
    lon: 'longitude'
  }
  const expected = {filters: {}, lat: 40.7128, lon: -74.006}
  t.deepEqual(prepareParams(item, options), expected)
})

test('prepareParams - reverse geocoding with invalid coordinates', t => {
  const item = {latitude: 'invalid', longitude: '-74.0060'}
  const options = {
    reverse: true,
    columns: null,
    citycode: null,
    postcode: null,
    lat: 'latitude',
    lon: 'longitude'
  }
  t.is(prepareParams(item, options), null)
})

test('prepareParams - forward geocoding with invalid query', t => {
  const item = {street: '!', city: 'b'}
  const options = {
    reverse: false,
    columns: ['street', 'city'],
    citycode: null,
    postcode: null,
    lat: null,
    lon: null
  }
  t.is(prepareParams(item, options), null)
})

test('prepareParams - forward geocoding with invalid first character', t => {
  const item = {street: '@Main St', city: 'Anytown'}
  const options = {
    reverse: false,
    columns: ['street', 'city'],
    citycode: null,
    postcode: null,
    lat: null,
    lon: null
  }
  t.is(prepareParams(item, options), null)
})

test('prepareParams - forward geocoding with lat and lon', t => {
  const item = {street: '123 Main St', city: 'Anytown', latitude: '40.7128', longitude: '-74.0060'}
  const options = {
    reverse: false,
    columns: ['street', 'city'],
    citycode: null,
    postcode: null,
    lat: 'latitude',
    lon: 'longitude'
  }
  const expected = {q: '123 Main St Anytown', filters: {}, lat: 40.7128, lon: -74.006}
  t.deepEqual(prepareParams(item, options), expected)
})
