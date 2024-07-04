import process from 'node:process'
import test from 'ava'
import {getOperationFunction, executeBatch} from '../batch.js'

test('getOperationFunction', t => {
  const operations = {
    async geocode() {},
    async reverse() {}
  }

  t.is(getOperationFunction('geocode', operations), operations.geocode)
  t.is(getOperationFunction('reverse', operations), operations.reverse)
  t.throws(() => getOperationFunction('foo', operations), {
    message: 'Operation foo is not supported'
  })
})

test('executeBatch / missing requests', async t => {
  await t.throwsAsync(() => executeBatch(null, {operations: {}}), {message: 'requests is a required param (array)'})
})

test('executeBatch / too many requests', async t => {
  const requests = Array.from({length: 101}, (_, i) => ({operation: 'geocode', params: {q: i}, id: i}))
  await t.throwsAsync(() => executeBatch(requests, {operations: {}}), {message: 'requests must not contains more than 100 items'})
})

test('executeBatch / unknown operation', async t => {
  const requests = [{operation: 'foo', params: {q: 'bar'}, id: '1'}]
  await t.throwsAsync(() => executeBatch(requests, {operations: {}}), {message: 'operation is unknown'})
})

test('executeBatch / missing params', async t => {
  const requests = [{operation: 'geocode', id: '1'}]
  await t.throwsAsync(() => executeBatch(requests, {operations: {geocode: 'foo'}}), {message: 'params is required for each requests item'})
})

test('executeBatch / basic', async t => {
  const operations = {
    async geocode() {
      return [
        {
          properties: {foo: 'bar', score: 0.8},
          geometry: {coordinates: [1, 2]}
        }
      ]
    },
    async reverse() {
      return [
        {
          properties: {bar: 'baz', score: 0.9},
          geometry: {coordinates: [2, 1]}
        },
        {
          properties: {score: 0.7},
          geometry: {coordinates: [1, 2]}
        }
      ]
    }
  }

  const requests = [
    {operation: 'geocode', params: {q: 'foo'}, id: '1'},
    {operation: 'reverse', params: {lat: 1, lon: 2}, id: '2'}
  ]

  const results = await executeBatch(requests, {operations, signal: null})

  t.deepEqual(results, [
    {
      id: '1',
      status: 'ok',
      result: {
        foo: 'bar',
        score: 0.8,
        nextResultScore: undefined,
        lon: 1,
        lat: 2
      }
    },
    {
      id: '2',
      status: 'ok',
      result: {
        bar: 'baz',
        score: 0.9,
        nextResultScore: 0.7,
        lon: 2,
        lat: 1
      }
    }
  ])
})

test('executeBatch / error', async t => {
  const operations = {
    async geocode() {
      throw new Error('geocode error')
    },
    async reverse() {}
  }

  const requests = [
    {operation: 'geocode', params: {q: 'foo'}, id: '1'}
  ]

  const results = await executeBatch(requests, {operations})

  t.deepEqual(results, [
    {
      id: '1',
      status: 'error',
      error: 'geocode error'
    }
  ])
})

test('executeBatch / not found', async t => {
  const operations = {
    async geocode() {
      return []
    },
    async reverse() {}
  }

  const requests = [
    {operation: 'geocode', params: {q: 'foo'}, id: '1'}
  ]

  const results = await executeBatch(requests, {operations})

  t.deepEqual(results, [
    {
      id: '1',
      status: 'not-found'
    }
  ])
})

test('executeBatch / abort', async t => {
  const ac = new AbortController()

  const operations = {
    async geocode(params, {signal}) {
      return new Promise((resolve, reject) => {
        process.nextTick(() => {
          if (signal.aborted) {
            reject(new Error('The operation was aborted'))
          }

          resolve([
            {
              properties: {foo: 'bar', score: 0.8},
              geometry: {coordinates: [1, 2]}
            }
          ])
        })
      })
    }
  }

  const requests = [
    {operation: 'geocode', params: {q: 'foo'}, id: '1'}
  ]

  const promise = executeBatch(requests, {operations, signal: ac.signal})
  ac.abort()

  const results = await promise

  t.deepEqual(results, [
    {
      id: '1',
      status: 'error',
      error: 'The operation was aborted'
    }
  ])
})
