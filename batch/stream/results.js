/* eslint-disable camelcase */
import {chain, mapKeys, pick} from 'lodash-es'

const INDEX_RESULT_FIELDS = {
  address: [
    'result_label',
    'result_type',
    'result_id',
    'result_housenumber',
    'result_name',
    'result_street',
    'result_postcode',
    'result_city',
    'result_context',
    'result_citycode',
    'result_oldcitycode',
    'result_oldcity',
    'result_district',
    'result_importance',
    'result_x',
    'result_y'
  ],

  poi: [
    'result_name',
    'result_toponym',
    'result_category',
    'result_postcode',
    'result_citycode',
    'result_city',
    'result_classification',
    'result_territory'
  ],

  parcel: [
    'result_departmentcode',
    'result_municipalitycode',
    'result_section',
    'result_sheet',
    'result_number',
    'result_oldmunicipalitycode',
    'result_districtcode'
  ]
}

const OPERATION_RESULT_FIELDS = {
  search: [
    'longitude',
    'latitude',
    'result_score',
    'result_score_next'
  ],

  reverse: [
    'result_longitude',
    'result_latitude',
    'result_distance',
    'result_score',
    'result_score_next'
  ]
}

const RESULT_FIELDS = [
  'result_status',
  'result_index'
]

// Compatibilité API Adresse
const ADDRESS_ONLY_DEFAULT_OMITTED_FIELDS = {
  search: new Set([
    'result_importance',
    'result_x',
    'result_y',
    'result_index'
  ]),

  reverse: new Set([
    'result_importance',
    'result_x',
    'result_y',
    'result_index',
    'result_score',
    'result_score_next'
  ])
}

export function createEmptyResultItem(indexes, operation) {
  const isAddressOnly = indexes.length === 1 && indexes[0] === 'address'
  const columns = []

  for (const field of OPERATION_RESULT_FIELDS[operation]) {
    columns.push(field)
  }

  for (const index of indexes) {
    for (const field of INDEX_RESULT_FIELDS[index]) {
      columns.push(field)
    }
  }

  for (const field of RESULT_FIELDS) {
    columns.push(field)
  }

  return chain(columns).uniq()
    .filter(column => !isAddressOnly || !ADDRESS_ONLY_DEFAULT_OMITTED_FIELDS[operation].has(column))
    .map(resultColumn => [resultColumn, ''])
    .fromPairs()
    .value()
}

export function convertResultItem(resultItem, emptyResultItem) {
  const {status, result, index} = resultItem

  return {
    ...emptyResultItem,
    ...mapKeys(result, (value, key) => {
      if (key === 'lon') {
        return 'longitude'
      }

      if (key === 'lat') {
        return 'latitude'
      }

      return `result_${key}`
    }),
    result_status: status,
    result_index: index
  }
}

export function expandItemWithResult(item, resultItem, emptyResultItem, resultColumns) {
  const mergedResultItem = convertResultItem(resultItem, emptyResultItem)

  for (const [key, value] of Object.entries(mergedResultItem)) {
    if (Array.isArray(value)) {
      mergedResultItem[key] = value[0]
    }
  }

  const finalResultItem = pick(mergedResultItem, resultColumns || Object.keys(emptyResultItem))

  return {
    ...item,
    ...finalResultItem
  }
}
