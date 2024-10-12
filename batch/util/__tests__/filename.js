import test from 'ava'

import {computeOutputFilename} from '../filename.js'

test('computeOutputFilename', t => {
  t.is(computeOutputFilename('input.csv'), 'input-geocoded.csv')
  t.is(computeOutputFilename('input'), 'input-geocoded.csv')
  t.is(computeOutputFilename('input.txt'), 'input-geocoded.csv')
  t.is(computeOutputFilename(''), 'geocoded.csv')
  t.is(computeOutputFilename(null), 'geocoded.csv')
  t.is(computeOutputFilename(undefined), 'geocoded.csv')
  t.is(computeOutputFilename('input.txt', 'geojson'), 'input-geocoded.geojson')
})
