/* eslint-disable camelcase */
import {createReadStream} from 'node:fs'
import {rm} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

import {fromPairs, mapKeys, pick} from 'lodash-es'
import onFinished from 'on-finished'
import createHttpError from 'http-errors'
import contentDisposition from 'content-disposition'
import stringify from 'csv-write-stream'
import iconv from 'iconv-lite'
import {previewCsvFromStream, validateCsvFromStream, createCsvReadStream} from '@livingdata/tabular-data-helpers'

import logger from '../lib/logger.js'

import batchTransform from './util/batch-transform-stream.js'
import batch from './operations/batch.js'

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

export function csv({operation, indexes}) {
  return async (req, res) => {
    if (!req.file) {
      throw createHttpError(400, 'A CSV file must be provided in data field')
    }

    const ac = new AbortController()
    const {signal} = ac

    // Register file cleanup routine
    onFinished(res, async () => {
      try {
        if (req.file) {
          await rm(req.file.path, {force: true})
        }

        ac.abort()
      } catch (error) {
        logger.error(error)
      }
    })

    const {
      parseErrors,
      columns: columnsInFile,
      formatOptions
    } = await previewCsvFromStream(createReadStream(req.file.path))

    if (parseErrors) {
      throw createHttpError(400, 'Errors in CSV file: ' + parseErrors.join(', '))
    }

    await new Promise((resolve, reject) => {
      validateCsvFromStream(createReadStream(req.file.path), {formatOptions})
        .on('error', error => reject(createHttpError(400, error.message)))
        .on('complete', () => resolve())
    })

    const geocodeOptions = {}

    if (req.body.columns) {
      geocodeOptions.columns = ensureArray(req.body.columns)

      if (geocodeOptions.columns.some(c => !columnsInFile.includes(c))) {
        throw createHttpError(400, 'At least one given column name is unknown')
      }
    } else {
      geocodeOptions.columns = columnsInFile
    }

    if (req.body.citycode) {
      geocodeOptions.citycode = req.body.citycode
    }

    if (req.body.postcode) {
      geocodeOptions.postcode = req.body.postcode
    }

    if (req.body.type) {
      geocodeOptions.type = req.body.type
    }

    if (req.body.lon) {
      geocodeOptions.lon = req.body.type
    }

    if (req.body.lat) {
      geocodeOptions.lat = req.body.lat
    }

    if (req.body.result_columns) {
      geocodeOptions.resultColumns = ensureArray(req.body.result_columns)
    }

    const filename = req.file.originalname ? 'geocoded-' + req.file.originalname : 'geocoded.csv'

    res
      .set('content-type', 'text/csv')
      .set('content-disposition', contentDisposition(filename))

    await pipeline(
      createReadStream(req.file.path),
      createCsvReadStream({formatOptions}),
      createGeocodeStream(geocodeOptions, {operation, indexes, signal}),
      stringify({separator: formatOptions.delimiter, newline: formatOptions.linebreak}),
      iconv.encodeStream('utf8'),
      res,
      {signal}
    )
  }
}

function ensureArray(value) {
  if (value) {
    return Array.isArray(value) ? value : [value]
  }

  return []
}

function getLon(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.longitude) {
    return Number.parseFloat(item.longitude)
  }

  if (item.lon) {
    return Number.parseFloat(item.lon)
  }

  if (item.lng) {
    return Number.parseFloat(item.lng)
  }

  if (item.long) {
    return Number.parseFloat(item.long)
  }
}

function getLat(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.latitude) {
    return Number.parseFloat(item.latitude)
  }

  if (item.lat) {
    return Number.parseFloat(item.lat)
  }
}

function prepareParams(item, {reverse, columns, citycode, postcode, lat, lon}) {
  const params = {
    filters: {}
  }

  if (!reverse && columns) {
    const stringToGeocode = columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
      .trim()

    params.q = stringToGeocode
  }

  if (citycode && item[citycode]) {
    params.filters.citycode = item[citycode]
  }

  if (postcode && item[postcode]) {
    params.filters.postcode = item[postcode]
  }

  if (reverse) {
    params.lat = getLat(item, lat)
    params.lon = getLon(item, lon)

    if (!params.lat || !params.lon || Number.isNaN(params.lat) || Number.isNaN(params.lat)) {
      return null
    }
  } else {
    if (lon && item[lon]) {
      params.lon = Number.parseFloat(item[lon])
    }

    if (lat && item[lat]) {
      params.lat = Number.parseFloat(item[lat])
    }

    if (!params.q || params.q.length < 3 || !isFirstCharValid(params.q.charAt(0))) {
      return null
    }
  }

  return params
}

function prepareRequest(item, options) {
  const params = prepareParams(item, options)

  if (!params) {
    return null
  }

  return {
    operation: options.reverse ? 'reverse' : 'search',
    params
  }
}

function createEmptyResultItem(operation) {
  return fromPairs(DEFAULT_RESULT_COLUMNS[operation].map(resultColumn => [resultColumn, '']))
}

function convertResultItem(resultItem, emptyResultItem) {
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

function expandItemWithResult(item, resultItem, emptyResultItem, resultColumns) {
  const mergedResultItem = convertResultItem(resultItem, emptyResultItem)
  const finalResultItem = resultColumns
    ? pick(mergedResultItem, resultColumns)
    : mergedResultItem

  return {
    ...item,
    ...finalResultItem
  }
}

function isFirstCharValid(firstChar) {
  return (firstChar.toLowerCase() !== firstChar.toUpperCase())
    || (firstChar.codePointAt(0) >= 48 && firstChar.codePointAt(0) <= 57)
}

function createGeocodeStream(geocodeOptions, {operation, indexes, signal}) {
  async function handler(items) {
    const preparedRequests = items.map(item => prepareRequest(item, {
      reverse: operation === 'reverse',
      columns: geocodeOptions.columns,
      citycode: geocodeOptions.citycode,
      postcode: geocodeOptions.postcode,
      lat: geocodeOptions.lat,
      lon: geocodeOptions.lon
    }))

    const emptyResultItem = createEmptyResultItem(operation)

    try {
      const batchResults = await batch({
        requests: preparedRequests.filter(Boolean) // Remove null values
      }, {indexes, signal})

      return items.map((item, i) => {
        const resultItem = preparedRequests[i] ? batchResults.shift() : {status: 'skipped', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.resultColumns)
      })
    } catch (error) {
      logger.error(error)

      return items.map(item => {
        const resultItem = {status: 'error', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.resultColumns)
      })
    }
  }

  return batchTransform(handler, 100, {concurrency: 2, signal})
}
