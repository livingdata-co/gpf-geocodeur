import createHttpError from 'http-errors'
import {pickBy} from 'lodash-es'

import {GEOCODE_INDEXES} from '../lib/config.js'

export function ensureArray(value) {
  if (value) {
    return Array.isArray(value) ? value : [value]
  }

  return []
}

export function extractIndexes(indexesValue) {
  if (!indexesValue) {
    return ['address']
  }

  indexesValue = ensureArray(indexesValue)

  if (indexesValue.length === 0) {
    return ['address']
  }

  const invalidValue = indexesValue.find(index => !GEOCODE_INDEXES.includes(index))

  if (invalidValue) {
    throw createHttpError(400, 'Unsupported index type: ' + invalidValue)
  }

  // Remove duplicates
  return [...new Set(indexesValue)]
}

export function extractOperation(operation) {
  if (!operation) {
    return 'search'
  }

  if (operation === 'search' || operation === 'reverse') {
    return operation
  }

  throw createHttpError(400, 'Unsupported operation: ' + operation)
}

export function extractFilter(options, filterName, columnsInFile) {
  const columnName = options[filterName]

  if (columnName && typeof columnName !== 'string') {
    throw createHttpError(400, `Invalid ${filterName} value`)
  }

  if (columnsInFile && columnName && !columnsInFile.includes(columnName)) {
    throw createHttpError(400, `Unknown column name for ${filterName}`)
  }

  return columnName
}

const FILTERS = [
  'citycode',
  'postcode',
  'type',
  'category',
  'departmentcode',
  'municipalitycode',
  'oldmunicipalitycode',
  'districtcode',
  'section',
  'sheet',
  'number',
  'lon',
  'lat'
]

export function extractGeocodeOptions(body, {columnsInFile} = {}) {
  const geocodeOptions = {}

  if (body.columns) {
    geocodeOptions.columns = ensureArray(body.columns)

    if (columnsInFile && geocodeOptions.columns.some(c => !columnsInFile.includes(c))) {
      throw createHttpError(400, 'At least one given column name is unknown')
    }
  } else {
    geocodeOptions.columns = columnsInFile || undefined
  }

  geocodeOptions.operation = extractOperation(body.operation)

  for (const filterName of FILTERS) {
    geocodeOptions[filterName] = extractFilter(body, filterName, columnsInFile)
  }

  if (body.result_columns) {
    geocodeOptions.resultColumns = ensureArray(body.result_columns)
  }

  geocodeOptions.indexes = extractIndexes(body.indexes)

  return pickBy(geocodeOptions, value => value !== undefined)
}
