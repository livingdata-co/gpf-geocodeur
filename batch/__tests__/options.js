/* eslint-disable camelcase */
import test from 'ava'

import {extractGeocodeOptions} from '../options.js'

test('extractGeocodeOptions / geocode options', t => {
  const req = {
    body: {
      columns: ['col1', 'col2'],
      citycode: '75001',
      postcode: '75001',
      type: 'address',
      lon: 'longitude',
      lat: 'latitude',
      result_columns: ['result_col1', 'result_col2']
    },
    columnsInFile: ['col1', 'col2', 'col3']
  }

  const expected = {
    columns: ['col1', 'col2'],
    citycode: '75001',
    postcode: '75001',
    type: 'address',
    lon: 'longitude',
    lat: 'latitude',
    resultColumns: ['result_col1', 'result_col2'],
    indexes: ['address']
  }

  const actual = extractGeocodeOptions(req)
  t.deepEqual(actual, expected)
})

test('extractGeocodeOptions / unknown column name', t => {
  const req = {
    body: {
      columns: ['col1', 'unknown_col']
    },
    columnsInFile: ['col1', 'col2', 'col3']
  }

  const error = t.throws(() => extractGeocodeOptions(req))
  t.is(error.status, 400)
  t.is(error.message, 'At least one given column name is unknown')
})

test('extractGeocodeOptions / default columns', t => {
  const req = {
    body: {},
    columnsInFile: ['col1', 'col2', 'col3']
  }

  const expected = {
    columns: ['col1', 'col2', 'col3'],
    indexes: ['address']
  }

  const actual = extractGeocodeOptions(req)
  t.deepEqual(actual, expected)
})
