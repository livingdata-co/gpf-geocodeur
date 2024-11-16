import {createReadStream} from 'node:fs'
import {rm} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

import onFinished from 'on-finished'
import contentDisposition from 'content-disposition'
import iconv from 'iconv-lite'
import {createCsvReadStream} from '@livingdata/tabular-data-helpers'

import logger from '../../lib/logger.js'

import batch from '../operations/batch.js'

import {computeOutputFilename} from '../../batch/util/filename.js'
import {createGeocodeStream} from '../../batch/stream/index.js'
import {extractGeocodeOptions} from '../../batch/options.js'
import {createWriteStream} from '../../batch/writers/csv.js'

export {parseAndValidate} from './parse.js'

export function csv({operation, indexes}) {
  return async (req, res) => {
    const ac = new AbortController()
    const {signal} = ac

    // Register file cleanup routine
    onFinished(res, async () => {
      try {
        ac.abort()
        await rm(req.file.path, {force: true})
      } catch (error) {
        logger.error(error)
      }
    })

    const geocodeOptions = extractGeocodeOptions(
      {...req.body, operation},
      {columnsInFile: req.columnsInFile}
    )

    const filename = computeOutputFilename(req.file.originalname)

    res
      .set('content-type', 'text/csv')
      .set('content-disposition', contentDisposition(filename))
      .set('x-rows-count', req.readRows)

    await pipeline(
      createReadStream(req.file.path),
      createCsvReadStream({formatOptions: req.formatOptions}),
      createGeocodeStream(geocodeOptions, {indexes, signal, batch}),
      createWriteStream(req.formatOptions),
      iconv.encodeStream('utf8'),
      res,
      {signal}
    )
  }
}
