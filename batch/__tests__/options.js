/* eslint-disable camelcase */
import test from 'ava'

import {extractGeocodeOptions, extractIndexes, ensureArray, extractOperation, extractFilter} from '../options.js'

test('extractGeocodeOptions / geocode options', t => {
  const body = {
    columns: ['numero', 'voie', 'code_postal', 'ville'],
    citycode: 'citycode',
    postcode: 'code_postal',
    type: 'type',
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
    extraneous: 'extraneous',
    result_columns: ['result_col1', 'result_col2']
  }

  const columnsInFile = ['numero', 'voie', 'type', 'citycode', 'code_postal', 'ville', 'longitude', 'latitude', 'category', 'departmentcode', 'municipalitycode', 'oldmunicipalitycode', 'districtcode', 'section', 'sheet', 'number']

  const expected = {
    columns: ['numero', 'voie', 'code_postal', 'ville'],
    citycode: 'citycode',
    postcode: 'code_postal',
    type: 'type',
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
    result_columns: ['result_col1', 'result_col2'],
    indexes: ['address'],
    operation: 'search'
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
    indexes: ['address'],
    operation: 'search'
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

test('extractOperation', t => {
  t.is(extractOperation('search'), 'search')
  t.is(extractOperation('reverse'), 'reverse')
  t.is(extractOperation(), 'search')
  t.throws(() => extractOperation('unknown'), {message: 'Unsupported operation: unknown'})
})

test('extractFilter', t => {
  t.is(extractFilter({}, 'citycode', ['citycode']), undefined)
  t.is(extractFilter({citycode: 'citycode'}, 'citycode', ['citycode']), 'citycode')
  t.throws(() => extractFilter({citycode: 'unknown'}, 'citycode', ['citycode']), {message: 'Unknown column name for citycode'})
  t.throws(() => extractFilter({citycode: 123}, 'citycode', ['citycode']), {message: 'Invalid citycode value'})
  t.throws(() => extractFilter({citycode: 'citycode'}, 'citycode', ['unknown']), {message: 'Unknown column name for citycode'})
})
