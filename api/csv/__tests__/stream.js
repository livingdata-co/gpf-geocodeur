import test from 'ava'

import {prepareRequest} from '../stream.js'

test('prepareRequest / empty address columns', t => {
  const item = {id: 1}
  const options = {
    reverse: false,
    columns: ['column1'],
    citycode: '75001',
    postcode: '75001',
    lat: 'lat',
    lon: 'lon'
  }

  const result = prepareRequest(item, options)

  t.is(result, null)
})

test('prepareRequest / missing lon', t => {
  const item = {id: 1}
  const options = {
    reverse: true,
    citycode: '75001',
    postcode: '75001',
    lat: 'lat',
    lon: 'lon'
  }

  const result = prepareRequest(item, options)

  t.is(result, null)
})

test('prepareRequest / valid search', t => {
  const item = {id: 1, column1: 'test'}
  const options = {
    reverse: false,
    columns: ['column1'],
    citycode: '75001',
    postcode: '75001',
    lat: 'lat',
    lon: 'lon'
  }

  const result = prepareRequest(item, options)

  t.deepEqual(result, {
    operation: 'search',
    params: {
      q: 'test',
      filters: {}
    }
  })
})

test('prepareRequest / valid reverse', t => {
  const item = {id: 1, lon: '0.1', lat: '0.2'}
  const options = {
    reverse: true,
    citycode: '75001',
    postcode: '75001',
    lat: 'lat',
    lon: 'lon'
  }

  const result = prepareRequest(item, options)

  t.deepEqual(result, {
    operation: 'reverse',
    params: {
      lon: 0.1,
      lat: 0.2,
      filters: {}
    }
  })
})
