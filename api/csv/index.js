import {createReadStream} from 'node:fs'
import {rm} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

import createHttpError from 'http-errors'
import onFinished from 'on-finished'
import contentDisposition from 'content-disposition'
import stringify from 'csv-write-stream'
import iconv from 'iconv-lite'
import {createCsvReadStream} from '@livingdata/tabular-data-helpers'

import logger from '../../lib/logger.js'
import {GEOCODE_INDEXES} from '../../lib/config.js'

import batch from '../operations/batch.js'

import {computeOutputFilename} from '../../batch/util/filename.js'
import {createGeocodeStream} from '../../batch/stream/index.js'

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

    const geocodeOptions = extractGeocodeOptions(req)
    const filename = computeOutputFilename(req.file.originalname)

    res
      .set('content-type', 'text/csv')
      .set('content-disposition', contentDisposition(filename))
      .set('x-rows-count', req.readRows)

    await pipeline(
      createReadStream(req.file.path),
      createCsvReadStream({formatOptions: req.formatOptions}),
      createGeocodeStream(geocodeOptions, {operation, indexes, signal, batch}),
      stringify({separator: req.formatOptions.delimiter, newline: req.formatOptions.linebreak}),
      iconv.encodeStream('utf8'),
      res,
      {signal}
    )
  }
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

export function extractGeocodeOptions(req) {
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

  if (req.body.category) {
    geocodeOptions.category = req.body.category
  }

  if (req.body.departmentcode) {
    geocodeOptions.departmentcode = req.body.departmentcode
  }

  if (req.body.municipalitycode) {
    geocodeOptions.municipalitycode = req.body.municipalitycode
  }

  if (req.body.oldmunicipalitycode) {
    geocodeOptions.oldmunicipalitycode = req.body.oldmunicipalitycode
  }

  if (req.body.districtcode) {
    geocodeOptions.districtcode = req.body.districtcode
  }

  if (req.body.section) {
    geocodeOptions.section = req.body.section
  }

  if (req.body.sheet) {
    geocodeOptions.sheet = req.body.sheet
  }

  if (req.body.number) {
    geocodeOptions.number = req.body.number
  }

  if (req.body.lon) {
    geocodeOptions.lon = req.body.lon
  }

  if (req.body.lat) {
    geocodeOptions.lat = req.body.lat
  }

  if (req.body.result_columns) {
    geocodeOptions.resultColumns = ensureArray(req.body.result_columns)
  }

  geocodeOptions.indexes = extractIndexes(req.body.indexes)

  return geocodeOptions
}

export function ensureArray(value) {
  if (value) {
    return Array.isArray(value) ? value : [value]
  }

  return []
}
