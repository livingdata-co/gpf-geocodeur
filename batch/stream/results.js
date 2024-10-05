/* eslint-disable camelcase */
import {fromPairs, mapKeys, pick} from 'lodash-es'

export const DEFAULT_RESULT_COLUMNS = {
  address: {
    search: [
      'result_index',
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
      'result_importance',
      'result_x',
      'result_y',
      'result_status'
    ],
    reverse: [
      'result_index',
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
      'result_importance',
      'result_x',
      'result_y',
      'result_status'
    ]
  },
  poi: {
    search: [
      'result_index',
      'result_name',
      'result_toponym',
      'result_category',
      'result_postcode',
      'result_citycode',
      'result_city',
      'result_classification',
      'result_territory',
      'result_score',
      'result_score_next',
      'longitude',
      'latitude',
      'result_status'
    ],
    reverse: [
      'result_index',
      'result_name',
      'result_toponym',
      'result_category',
      'result_postcode',
      'result_citycode',
      'result_city',
      'result_classification',
      'result_territory',
      'result_score',
      'result_score_next',
      'result_longitude',
      'result_latitude',
      'result_status'
    ]
  },
  parcel: {
    search: [
      'result_index',
      'result_status',
      'result_departmentcode',
      'result_municipalitycode',
      'result_section',
      'result_sheet',
      'result_number',
      'result_oldmunicipalitycode',
      'result_districtcode',
      'latitude',
      'longitude',
      'result_score',
      'result_score_next'
    ],
    reverse: [
      'result_index',
      'result_status',
      'result_latitude',
      'result_longitude',
      'result_departmentcode',
      'result_municipalitycode',
      'result_section',
      'result_sheet',
      'result_number',
      'result_oldmunicipalitycode',
      'result_districtcode',
      'result_distance',
      'result_score',
      'result_score_next'
    ]
  }
}

export function createEmptyResultItem(indexes, operation) {
  let columns = []

  for (const index of indexes) {
    const indexColumns = DEFAULT_RESULT_COLUMNS[index]?.[operation]
    if (!indexColumns) {
      throw new Error(`Invalid index or operation: ${index}, ${operation}`)
    }

    columns = [...columns, ...indexColumns]
  }

  return fromPairs(columns.map(resultColumn => [resultColumn, '']))
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

  const finalResultItem = resultColumns
    ? pick(mergedResultItem, resultColumns)
    : mergedResultItem

  return {
    ...item,
    ...finalResultItem
  }
}
