/* eslint-disable camelcase */
import test from 'ava'
import {createEmptyResultItem, convertResultItem, expandItemWithResult} from '../results.js'

test('createEmptyResultItem - search operation', t => {
  const operation = 'search'
  const expected = {
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
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(operation), expected)
})

test('createEmptyResultItem - reverse operation', t => {
  const operation = 'reverse'
  const expected = {
    result_latitude: '',
    result_longitude: '',
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
    result_status: ''
  }
  t.deepEqual(createEmptyResultItem(operation), expected)
})

test('convertResultItem', t => {
  const resultItem = {
    status: 'OK',
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123'
    }
  }
  const emptyResultItem = createEmptyResultItem('search')
  const expected = {
    ...emptyResultItem,
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
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123',
      someKey: 'someValue'
    }
  }
  const emptyResultItem = createEmptyResultItem('search')
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
    result: {
      lat: '40.7128',
      lon: '-74.0060',
      label: 'New York',
      type: 'city',
      id: '123'
    }
  }
  const emptyResultItem = createEmptyResultItem('search')
  const expected = {
    someKey: 'someValue',
    ...convertResultItem(resultItem, emptyResultItem)
  }
  t.deepEqual(expandItemWithResult(item, resultItem, emptyResultItem), expected)
})
