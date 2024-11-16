import {Transform} from 'node:stream'

import pumpify from 'pumpify'
import pLimit from 'p-limit'
import iconv from 'iconv-lite'

import {validateCsvFromStream, createCsvReadStream, previewCsvFromStream} from '@livingdata/tabular-data-helpers'

import logger from '../../lib/logger.js'

import batch from '../../api/operations/batch.js'

import {createGeocodeStream} from '../stream/index.js'
import {computeOutputFilename} from '../util/filename.js'
import {extractGeocodeOptions} from '../options.js'

import {createWriteStream as createGeoJsonWriteStream} from '../writers/geojson.js'
import {createWriteStream as createCsvWriteStream} from '../writers/csv.js'

const OUTPUT_FORMATS = {
  csv: createCsvWriteStream,
  geojson: createGeoJsonWriteStream
}

export async function executeProcessing(projectId, {signal, model, indexes}) {
  try {
    logger.log(`${projectId} | start processing`)

    const project = await model.getProject(projectId)
    const {inputFile} = project

    const upLimit = pLimit(1)

    /* Guessing CSV format */

    const previewInputStream = await model.getInputFileDownloadStream(projectId)
    const {columns, formatOptions} = await previewCsvFromStream(previewInputStream)

    /* Validation */

    let totalRows = null

    await upLimit(() => model.updateProcessing(projectId, {
      step: 'validating',
      validationProgress: {readRows: 0, readBytes: 0, totalBytes: inputFile.size}
    }))

    const validationInputStream = await model.getInputFileDownloadStream(projectId)

    await new Promise((resolve, reject) => {
      const validation = validateCsvFromStream(validationInputStream, {formatOptions})

      validation
        .on('progress', async progress => {
          await upLimit(() => model.updateProcessing(projectId, {
            validationProgress: {readRows: progress.readRows, readBytes: progress.readBytes, totalBytes: inputFile.size}
          }))
        })
        .on('error', async error => {
          await upLimit(() => model.updateProcessing(projectId, {
            validationError: error.message
          }))
          reject(new Error('Validation failed'))
        })
        .on('complete', async () => {
          totalRows = validation.readRows
          await upLimit(() => model.updateProcessing(projectId, {
            validationProgress: {readRows: validation.readRows, readBytes: validation.readBytes, totalBytes: inputFile.size}
          }))
          resolve()
        })
    })

    /* Geocoding */

    let readRows = 0

    await upLimit(() => model.updateProcessing(projectId, {
      step: 'geocoding',
      geocodingProgress: {readRows: 0, totalRows}
    }))

    const {outputFormat, geocodeOptions: rawGeocodeOptions} = project.pipeline

    const geocodeOptions = extractGeocodeOptions(
      rawGeocodeOptions,
      {columnsInFile: columns}
    )

    const inputFileName = project.inputFile.name
    const outputFileName = computeOutputFilename(inputFileName || 'result', outputFormat)

    const inputFileStream = await model.getInputFileDownloadStream(projectId)
    const createWriteStream = OUTPUT_FORMATS[outputFormat]

    const {concurrency} = project.params

    const fullGeocodeStream = pumpify(
      inputFileStream,
      createCsvReadStream({formatOptions}),
      createGeocodeStream(geocodeOptions, {signal, indexes, concurrency, batch}),
      // Transform stream to update the progress
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          readRows++

          if (readRows % 100 === 0) {
            upLimit(() => model.updateProcessing(projectId, {
              geocodingProgress: {readRows, totalRows}
            }))
          }

          this.push(chunk)
          callback()
        }
      }),
      createWriteStream(),
      iconv.encodeStream('utf8')
    )

    try {
      await model.setOutputFile(projectId, outputFileName, fullGeocodeStream)
      // Update the progress one last time
      await upLimit(() => model.updateProcessing(projectId, {
        geocodingProgress: {readRows, totalRows}
      }))
    } catch (error) {
      await upLimit(() => model.updateProcessing(projectId, {
        geocodingError: error.message
      }))
      throw new Error('Geocoding failed')
    }

    await upLimit(() => model.endProcessing(projectId, null))

    logger.log(`${projectId} | processed successfully`)
  } catch (error) {
    if (signal.aborted) {
      return
    }

    await model.endProcessing(projectId, error)

    logger.log(`${projectId} | error during processing`)
    logger.error(error)
  }
}
