/* eslint camelcase: off */
import path from 'node:path'
import test from 'ava'
import mockFs from 'mock-fs'
import {asFeature, extractFeatures} from '../extract.js'

test.before(() => {
  const entries = [
    {
      id: 'one',
      lon: 1,
      lat: 2,
      truegeometry: '{"type":"Point","coordinates":[1,2]}'
    },
    {
      id: 'two',
      lon: 3,
      lat: 4,
      truegeometry: '{"type":"Point","coordinates":[3,4]}'
    }
  ]

  mockFs({
    'poi.ndjson': entries.map(e => JSON.stringify(e)).join('\n'),
    'node_modules/readable-stream': mockFs.load(path.resolve('node_modules/readable-stream')) // Required because of async_iterator.js lazy loading
  })
})

test.after(() => {
  mockFs.restore()
})

test('asFeature', t => {
  const poiEntry = {
    id: 'one',
    lon: 1,
    lat: 2,
    truegeometry: '{"type":"Point","coordinates":[1,2]}'
  }

  t.deepEqual(asFeature(poiEntry), {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [1, 2]},
    properties: {
      id: 'one',
      lon: 1,
      lat: 2
    }
  })
})

test('extractFeatures', async t => {
  const features = []

  for await (const feature of extractFeatures('poi.ndjson')) {
    features.push(feature)
  }

  t.deepEqual(features, [
    {
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [1, 2]},
      properties: {
        id: 'one',
        lon: 1,
        lat: 2
      }
    },
    {
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [3, 4]},
      properties: {
        id: 'two',
        lon: 3,
        lat: 4
      }
    }
  ])
})
