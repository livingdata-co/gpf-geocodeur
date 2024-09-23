/* eslint-disable camelcase */
import test from 'ava'
import {createEmptyResultItem, convertResultItem, expandItemWithResult} from '../results.js'

test('createEmptyResultItem - search operation - address index', t => {
  const indexes = ['address']
  const operation = 'search'
  const expected = {
    result_index: '',
    latitude: '',
    longitude: '',
    result_label: '',
    result_score: '',
    result_score_next: '',
    result_type: '',
    result_id: '',
    result_housenumber: '',
    result_name: '',
    result_street: '',
    result_postcode: '',
    result_city: '',
    result_context: '',
    result_citycode: '',
    result_oldcitycode: '',
    result_oldcity: '',
    result_district: '',
    result_importance: '',
    result_x: '',
    result_y: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('createEmptyResultItem - search operation - poi index', t => {
  const indexes = ['poi']
  const operation = 'search'
  const expected = {
    result_index: '',
    result_name: '',
    result_toponym: '',
    result_category: '',
    result_postcode: '',
    result_citycode: '',
    result_city: '',
    result_classification: '',
    result_territory: '',
    result_score: '',
    result_score_next: '',
    latitude: '',
    longitude: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('createEmptyResultItem - reverse operation - address index', t => {
  const indexes = ['address']
  const operation = 'reverse'
  const expected = {
    result_index: '',
    latitude: '',
    longitude: '',
    result_distance: '',
    result_label: '',
    result_type: '',
    result_id: '',
    result_housenumber: '',
    result_name: '',
    result_street: '',
    result_postcode: '',
    result_city: '',
    result_context: '',
    result_citycode: '',
    result_oldcitycode: '',
    result_oldcity: '',
    result_district: '',
    result_importance: '',
    result_x: '',
    result_y: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('createEmptyResultItem - reverse operation - poi index', t => {
  const indexes = ['poi']
  const operation = 'reverse'
  const expected = {
    result_index: '',
    result_name: '',
    result_toponym: '',
    result_category: '',
    result_postcode: '',
    result_citycode: '',
    result_city: '',
    result_classification: '',
    result_territory: '',
    result_score: '',
    result_score_next: '',
    latitude: '',
    longitude: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('createEmptyResultItem - search operation - address & poi indexes', t => {
  const indexes = ['address', 'poi']
  const operation = 'search'
  const expected = {
    result_index: '',
    latitude: '',
    longitude: '',
    result_category: '',
    result_classification: '',
    result_score: '',
    result_score_next: '',
    result_label: '',
    result_type: '',
    result_id: '',
    result_housenumber: '',
    result_name: '',
    result_street: '',
    result_postcode: '',
    result_city: '',
    result_context: '',
    result_citycode: '',
    result_oldcitycode: '',
    result_oldcity: '',
    result_district: '',
    result_toponym: '',
    result_territory: '',
    result_importance: '',
    result_x: '',
    result_y: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('createEmptyResultItem - reverse operation - address & poi indexes', t => {
  const indexes = ['address', 'poi']
  const operation = 'reverse'
  const expected = {
    result_index: '',
    latitude: '',
    longitude: '',
    result_category: '',
    result_classification: '',
    result_score: '',
    result_score_next: '',
    result_distance: '',
    result_label: '',
    result_type: '',
    result_id: '',
    result_housenumber: '',
    result_name: '',
    result_street: '',
    result_postcode: '',
    result_city: '',
    result_context: '',
    result_citycode: '',
    result_oldcitycode: '',
    result_oldcity: '',
    result_district: '',
    result_toponym: '',
    result_territory: '',
    result_importance: '',
    result_x: '',
    result_y: '',
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(indexes, operation), expected)
})

test('convertResultItem - address index', t => {
  const resultItem = {
    status: 'OK',
    index: 'address',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123'
    }
  }
  const emptyResultItem = createEmptyResultItem(['address'], 'search')
  const expected = {
    ...emptyResultItem,
    result_index: 'address',
    result_label: 'New York',
    result_type: 'city',
    result_id: '123',
    result_status: 'OK',
    latitude: '40.7128',
    longitude: '-74.0060'
  }
  t.deepEqual(convertResultItem(resultItem, emptyResultItem), expected)
})

test('convertResultItem - poi index', t => {
  const resultItem = {
    status: 'OK',
    index: 'poi',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123'
    }
  }
  const emptyResultItem = createEmptyResultItem(['poi'], 'search')
  const expected = {
    ...emptyResultItem,
    result_index: 'poi',
    result_label: 'New York',
    result_type: 'city',
    result_id: '123',
    result_status: 'OK',
    latitude: '40.7128',
    longitude: '-74.0060'
  }
  t.deepEqual(convertResultItem(resultItem, emptyResultItem), expected)
})

test('expandItemWithResult - with resultColumns', t => {
  const item = {someInputKey: 'someInputValue'}
  const resultItem = {
    status: 'OK',
    index: 'address',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123',
      someKey: 'someValue'
    }
  }
  const emptyResultItem = createEmptyResultItem(['address'], 'search')
  const resultColumns = ['latitude', 'longitude', 'result_label']
  const expected = {
    latitude: '40.7128',
    longitude: '-74.0060',
    result_label: 'New York',
    someInputKey: 'someInputValue'
  }
  t.deepEqual(expandItemWithResult(item, resultItem, emptyResultItem, resultColumns), expected)
})

test('expandItemWithResult - with resultColumns - index poi', t => {
  const item = {someInputKey: 'someInputValue'}
  const resultItem = {
    status: 'OK',
    index: 'poi',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123',
      someKey: 'someValue'
    }
  }
  const emptyResultItem = createEmptyResultItem(['poi'], 'search')
  const resultColumns = ['latitude', 'longitude', 'result_label']
  const expected = {
    latitude: '40.7128',
    longitude: '-74.0060',
    result_label: 'New York',
    someInputKey: 'someInputValue'
  }
  t.deepEqual(expandItemWithResult(item, resultItem, emptyResultItem, resultColumns), expected)
})

test('expandItemWithResult - without resultColumns', t => {
  const item = {someKey: 'someValue'}
  const resultItem = {
    status: 'OK',
    index: 'address',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123'
    }
  }
  const emptyResultItem = createEmptyResultItem(['address'], 'search')
  const expected = {
    someKey: 'someValue',
    ...convertResultItem(resultItem, emptyResultItem)
  }
  t.deepEqual(expandItemWithResult(item, resultItem, emptyResultItem), expected)
})
