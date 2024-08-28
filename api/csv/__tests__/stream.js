/* eslint-disable camelcase */
import {Readable} from 'node:stream'
import {setTimeout} from 'node:timers/promises'

import test from 'ava'
import {getStreamAsArray} from 'get-stream'

import {prepareRequest, createGeocodeStream} from '../stream.js'

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
    id: 1,
    operation: 'search',
    params: {
      q: 'test'
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
    id: 1,
    operation: 'reverse',
    params: {
      lon: 0.1,
      lat: 0.2
    }
  })
})

function executeInBatch(items, operation, geocodeOptions, resultsByIdOrError) {
  const readable = Readable.from(items)

  async function batch({requests}) {
    if (resultsByIdOrError instanceof Error) {
      throw resultsByIdOrError
    }

    return Promise.all(requests.map(async ({id}) => {
      await setTimeout(10)
      return resultsByIdOrError[id]
    }))
  }

  return getStreamAsArray(readable.pipe(createGeocodeStream(geocodeOptions, {operation, batch})))
}

test('createGeocodeStream / search', async t => {
  const items = [{id: 1, column1: 'test'}]
  const operation = 'search'
  const geocodeOptions = {
    columns: ['column1'],
    resultColumns: ['result_status', 'result_error', 'result_result1']
  }
  const resultsById = {
    1: {status: 'ok', result: {result1: 'test'}}
  }

  const results = await executeInBatch(items, operation, geocodeOptions, resultsById)

  t.deepEqual(results, [{id: 1, column1: 'test', result_result1: 'test', result_status: 'ok'}])
})

test('createGeocodeStream / skipped', async t => {
  const items = [{id: 1, column1: ''}]
  const operation = 'search'
  const geocodeOptions = {
    columns: ['column1'],
    resultColumns: ['result_status', 'result_error', 'result_result1']
  }
  const resultsById = {
    1: {status: 'ok', result: {result1: 'test'}}
  }

  const results = await executeInBatch(items, operation, geocodeOptions, resultsById)

  t.deepEqual(results, [{id: 1, column1: '', result_status: 'skipped'}])
})

test('createGeocodeStream / batch error', async t => {
  const items = [{id: 1, column1: ''}]
  const operation = 'search'
  const geocodeOptions = {
    columns: ['column1'],
    resultColumns: ['result_status', 'result_error', 'result_result1', 'result_error']
  }

  const results = await executeInBatch(items, operation, geocodeOptions, new Error('Boom'))

  t.deepEqual(results, [{id: 1, column1: '', result_status: 'error'}])
})
