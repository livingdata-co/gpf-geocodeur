import {createReadStream} from 'node:fs'
import {rm} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

import onFinished from 'on-finished'
import createHttpError from 'http-errors'
import contentDisposition from 'content-disposition'
import stringify from 'csv-write-stream'
import iconv from 'iconv-lite'
import {createCsvReadStream} from '@livingdata/tabular-data-helpers'

import logger from '../../lib/logger.js'

import batchTransform from '../util/batch-transform-stream.js'
import batch from '../operations/batch.js'

import {prepareParams} from './params.js'
import {createEmptyResultItem, expandItemWithResult} from './results.js'

export {parseAndValidate} from './parse.js'

export function csv({operation, indexes}) {
  return async (req, res) => {
    const ac = new AbortController()
    const {signal} = ac

    // Register file cleanup routine
    onFinished(res, async () => {
      try {
        await rm(req.file.path, {force: true})
        ac.abort()
      } catch (error) {
        logger.error(error)
      }
    })

    const geocodeOptions = {}

    if (req.body.columns) {
      geocodeOptions.columns = ensureArray(req.body.columns)

      if (geocodeOptions.columns.some(c => !req.columnsInFile.includes(c))) {
        throw createHttpError(400, 'At least one given column name is unknown')
      }
    } else {
      geocodeOptions.columns = req.columnsInFile
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
      createCsvReadStream({formatOptions: req.formatOptions}),
      createGeocodeStream(geocodeOptions, {operation, indexes, signal}),
      stringify({separator: req.formatOptions.delimiter, newline: req.formatOptions.linebreak}),
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
