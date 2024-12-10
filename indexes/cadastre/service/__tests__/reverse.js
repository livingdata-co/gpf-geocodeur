import test from 'ava'
import {reverse, formatResult, computeDistance} from '../reverse.js'

test('reverse / no limit', t => {
  t.throws(() => reverse({
    center: 'center',
    filters: 'filters',
    returntruegeometry: false
  }, {rtreeIndex: 'foo', db: 'bar'}), {message: 'limit is a required param'})
})

test('reverse / no center', t => {
  t.throws(() => reverse({
    limit: 2,
    filters: 'filters',
    returntruegeometry: false
  }, {rtreeIndex: 'foo', db: 'bar'}), {message: 'search must be called with at least geometry or center param'})
})

test('reverse / huge bbox', t => {
  t.throws(() => reverse({
    center: 'center',
    limit: 2,
    filters: 'filters',
    returntruegeometry: false,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [
            2.35,
            48.8
          ],
          [
            2.35,
            48.85
          ],
          [
            2.35,
            48.85
          ],
          [
            2.35,
            48.85
          ],
          [
            2.35,
            48.85
          ]
        ]
      ]
    }
  }, {rtreeIndex: 'foo', db: 'bar'}), {message: 'geometry bbox height/width must be less than 1km'})
})

test('formatResult', t => {
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    }
  }

  const formatedResult = formatResult(feature, {distanceCache: 8})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {distance: 8, score: 0.9992}
  })
})

test('formatResult / center', t => {
  const center = [9, 4]
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    }
  }

  const formatedResult = formatResult(feature, {center})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {distance: 554_839, score: 0}
  })
})

test('computeDistance', t => {
  const center = [9, 4]
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    }
  }

  const computedDistance = computeDistance(feature, center)

  t.is(computedDistance, 554_839)
})
