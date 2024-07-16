/* eslint-disable camelcase */
import {fromPairs, mapKeys, pick} from 'lodash-es'

export const DEFAULT_RESULT_COLUMNS = {
  search: [
    'latitude',
    'longitude',
    'result_label',
    'result_score',
    'result_score_next',
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
    'result_status'
  ],

  reverse: [
    'result_latitude',
    'result_longitude',
    'result_distance',
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
    'result_status'
  ]
}

export function createEmptyResultItem(operation) {
  return fromPairs(DEFAULT_RESULT_COLUMNS[operation].map(resultColumn => [resultColumn, '']))
}

export function convertResultItem(resultItem, emptyResultItem) {
  const {status, result} = resultItem

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
    result_status: status
  }
}

export function expandItemWithResult(item, resultItem, emptyResultItem, resultColumns) {
  const mergedResultItem = convertResultItem(resultItem, emptyResultItem)
  const finalResultItem = resultColumns
    ? pick(mergedResultItem, resultColumns)
    : mergedResultItem

  return {
    ...item,
    ...finalResultItem
  }
}
