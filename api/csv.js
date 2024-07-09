import {createReadStream} from 'node:fs'
import {rm} from 'node:fs/promises'

import onFinished from 'on-finished'
import createHttpError from 'http-errors'
import contentDisposition from 'content-disposition'
import {previewCsvFromStream, validateCsvFromStream} from '@livingdata/tabular-data-helpers'

import logger from '../lib/logger.js'

export function csv() {
  return async (req, res) => {
    if (!req.file) {
      throw createHttpError(400, 'A CSV file must be provided in data field')
    }

    // Register file cleanup routine
    onFinished(res, async () => {
      try {
        if (req.file) {
          await rm(req.file.path, {force: true})
        }
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

    createReadStream(req.file.path).pipe(res)
  }
}

function ensureArray(value) {
  if (value) {
    return Array.isArray(value) ? value : [value]
  }

  return []
}
