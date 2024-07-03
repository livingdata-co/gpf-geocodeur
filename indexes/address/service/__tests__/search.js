import test from 'ava'
import {search} from '../search.js'

test('search / no addokCluster', async t => {
  await t.throwsAsync(async () => search({}, {}), {message: 'addokCluster is a required option'})
})

test('search / no returntruegeometry', async t => {
  const addokCluster = {
    geocode: async () => [{properties: {}}]
  }

  const results = await search({}, {addokCluster})

  t.deepEqual(results, [{properties: {}}])
})

test('search / returntruegeometry', async t => {
  const addokCluster = {
    geocode: async () => [{geometry: {foo: 'bar'}, properties: {}}]
  }

  const results = await search({returntruegeometry: true}, {addokCluster})

  t.deepEqual(results, [{
    geometry: {foo: 'bar'},
    properties: {truegeometry: '{"foo":"bar"}'}
  }])
})
