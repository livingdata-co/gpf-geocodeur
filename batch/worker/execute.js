import {Transform} from 'node:stream'

import pumpify from 'pumpify'
import pLimit from 'p-limit'

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

export async function executeProcessing(projectId, {model, indexes}) {
  try {
    logger.log(`${projectId} | start processing`)

    const project = await model.getProject(projectId)
    const {inputFile} = project

    const upLimit = pLimit(1)

    /* Validation */

    let totalRows = null

    await upLimit(() => model.updateProcessing(projectId, {
      step: 'validating',
      validationProgress: {readRows: 0, readBytes: 0, totalBytes: inputFile.size}
    }))

    const validationInputStream = await model.getInputFileDownloadStream(projectId)

    await new Promise((resolve, reject) => {
      const validation = validateCsvFromStream(validationInputStream, project.pipeline)

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

    const {columns} = await previewCsvFromStream(validationInputStream, project.pipeline)
    const {outputFormat} = project.pipeline
    const geocodeOptions = extractGeocodeOptions(project.pipeline.geocodeOptions, {columnsInFile: columns})

    const inputFileName = project.inputFile.filename
    const outputFileName = computeOutputFilename(inputFileName || 'result', outputFormat)

    const inputFileStream = await model.getInputFileDownloadStream(projectId)
    const createWriteStream = OUTPUT_FORMATS[outputFormat]

    const fullGeocodeStream = pumpify(
      inputFileStream,
      createCsvReadStream(project.pipeline),
      createGeocodeStream(geocodeOptions, {indexes, batch}),
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
      createWriteStream()
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

    await upLimit(() => model.endProcessing(projectId))

    logger.log(`${projectId} | processed successfully`)
  } catch (error) {
    await model.endProcessing(projectId, error)

    logger.log(`${projectId} | error during processing`)
    logger.error(error)
  }
}
