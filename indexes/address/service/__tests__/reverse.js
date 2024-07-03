import test from 'ava'
import {reverse, formatResult, computeDistance} from '../reverse.js'

test('reverse / no db', t => {
  t.throws(() => reverse({}, {
    database: 'no'
  }), {message: 'db is required'})
})

test('formatResult', t => {
  const feature = {
    properties: {
      foo: 'bar'
    },
    geometry: {
      type: 'Point',
      coordinates:
        [12, 8]
    }
  }

  const formatedResult = formatResult(feature, {distanceCache: 8})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {foo: 'bar', distance: 0}
  })
})

test('formatResult / center', t => {
  const center = [9, 4]
  const feature = {
    type: 'Feature',
    properties: {
      foo: 'bar'
    },
    geometry: {
      type: 'Point',
      coordinates:
        [12, 8]
    }
  }

  const formatedResult = formatResult(feature, {center})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {
      distance: 554_839,
      score: 0,
      foo: 'bar'
    }
  })
})

test('computeDistance', t => {
  const center = [9, 4]
  const feature = [4, 8]

  const computedDistance = computeDistance(feature, center)

  t.is(computedDistance, 709_528)
})
