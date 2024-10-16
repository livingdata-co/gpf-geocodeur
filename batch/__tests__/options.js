/* eslint-disable camelcase */
import test from 'ava'

import {extractGeocodeOptions, extractIndexes, ensureArray} from '../options.js'

test('extractGeocodeOptions / geocode options', t => {
  const body = {
    columns: ['col1', 'col2'],
    citycode: '75001',
    postcode: '75001',
    type: 'address',
    lon: 'longitude',
    lat: 'latitude',
    category: 'category',
    departmentcode: 'departmentcode',
    municipalitycode: 'municipalitycode',
    oldmunicipalitycode: 'oldmunicipalitycode',
    districtcode: 'districtcode',
    section: 'section',
    sheet: 'sheet',
    number: 'number',
    result_columns: ['result_col1', 'result_col2']
  }

  const columnsInFile = ['col1', 'col2', 'col3']

  const expected = {
    columns: ['col1', 'col2'],
    citycode: '75001',
    postcode: '75001',
    type: 'address',
    lon: 'longitude',
    lat: 'latitude',
    category: 'category',
    departmentcode: 'departmentcode',
    municipalitycode: 'municipalitycode',
    oldmunicipalitycode: 'oldmunicipalitycode',
    districtcode: 'districtcode',
    section: 'section',
    sheet: 'sheet',
    number: 'number',
    resultColumns: ['result_col1', 'result_col2'],
    indexes: ['address']
  }

  const actual = extractGeocodeOptions(body, {columnsInFile})
  t.deepEqual(actual, expected)
})

test('extractGeocodeOptions / unknown column name', t => {
  const body = {
    columns: ['col1', 'unknown_col']
  }

  const columnsInFile = ['col1', 'col2', 'col3']

  const error = t.throws(() => extractGeocodeOptions(body, {columnsInFile}))
  t.is(error.status, 400)
  t.is(error.message, 'At least one given column name is unknown')
})

test('extractGeocodeOptions / default columns', t => {
  const result = extractGeocodeOptions({}, {columnsInFile: ['col1', 'col2', 'col3']})

  t.deepEqual(result, {
    columns: ['col1', 'col2', 'col3'],
    indexes: ['address']
  })
})

test('extractIndexes', t => {
  t.deepEqual(extractIndexes('address'), ['address'])
  t.deepEqual(extractIndexes(['address']), ['address'])
  t.deepEqual(extractIndexes([]), ['address'])
  t.deepEqual(extractIndexes(undefined), ['address'])
  t.deepEqual(extractIndexes(['address', 'poi']), ['address', 'poi'])
  t.throws(() => extractIndexes('unknown'), {message: 'Unsupported index type: unknown'})
  t.throws(() => extractIndexes(['address', 'unknown']), {message: 'Unsupported index type: unknown'})
  t.deepEqual(extractIndexes(['address', 'poi', 'address']), ['address', 'poi'])
})

test('ensureArray', t => {
  t.deepEqual(ensureArray('value'), ['value'])
  t.deepEqual(ensureArray(['value']), ['value'])
  t.deepEqual(ensureArray(null), [])
  t.deepEqual(ensureArray(undefined), [])
})
