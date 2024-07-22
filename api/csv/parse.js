import {createReadStream} from 'node:fs'

import createHttpError from 'http-errors'

import {previewCsvFromStream, validateCsvFromStream} from '@livingdata/tabular-data-helpers'

const DEFAULT_MAX_ROWS = 200_000

export function parseAndValidate(options = {}) {
  const maxRows = options.maxRows || DEFAULT_MAX_ROWS

  return async (req, res, next) => {
    if (!req.file) {
      throw createHttpError(400, 'A CSV file must be provided in data field')
    }

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
        .on('complete', ({readRows}) => {
          if (readRows > maxRows) {
            throw createHttpError(400, 'Too many rows in CSV file')
          }

          req.readRows = readRows
          resolve()
        })
    })

    req.columnsInFile = columnsInFile
    req.formatOptions = formatOptions

    next()
  }
}
