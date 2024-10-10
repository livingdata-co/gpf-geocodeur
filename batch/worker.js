#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import 'dotenv/config.js'

import {cpus} from 'node:os'
import process from 'node:process'
import {Transform} from 'node:stream'

import pLimit from 'p-limit'
import pumpify from 'pumpify'

import {validateCsvFromStream, createCsvReadStream, previewCsvFromStream} from '@livingdata/tabular-data-helpers'

import {GEOCODE_INDEXES} from '../lib/config.js'

import batch from '../api/operations/batch.js'
import {createIndexes} from '../api/indexes/index.js'

import {createGeocodeStream} from './stream/index.js'

import {processNext, getInputFileDownloadStream, getProject, setOutputFile, endProcessing, updateProcessing, getStalledProjects, resetProcessing, askProcessing} from './models/project.js'

import {createWriteStream as createGeoJsonWriteStream} from './writers/geojson.js'
import {createWriteStream as createCsvWriteStream} from './writers/csv.js'

import {computeOutputFilename} from './util/filename.js'
import {extractGeocodeOptions} from './options.js'

const OUTPUT_FORMATS = {
  csv: createCsvWriteStream,
  geojson: createGeoJsonWriteStream
}

function getConcurrency() {
  if (process.env.WORKERS_CONCURRENCY) {
    return Number.parseInt(process.env.WORKERS_CONCURRENCY, 10)
  }

  return cpus().length
}

async function main() {
  const indexes = createIndexes(GEOCODE_INDEXES)

  const concurrency = getConcurrency()
  const processingProjects = new Map()
  const limit = pLimit(1)

  async function getNextJob() {
    if (processingProjects.size >= concurrency) {
      return
    }

    const projectId = await processNext()

    if (!projectId) {
      limit.clearQueue()
      return
    }

    const abortController = new AbortController()
    processingProjects.set(projectId, {abortController})

    process.nextTick(async () => {
      await executeProcessing(projectId, {signal: abortController.signal})
      processingProjects.delete(projectId)
      limit(() => getNextJob())
    })
  }

  async function executeProcessing(projectId) {
    try {
      console.log(`${projectId} | start processing`)

      const project = await getProject(projectId)
      const {inputFile} = project

      const upLimit = pLimit(1)

      /* Validation */

      let totalRows = null

      await upLimit(() => updateProcessing(projectId, {
        step: 'validating',
        validationProgress: {readRows: 0, readBytes: 0, totalBytes: inputFile.size}
      }))

      const validationInputStream = await getInputFileDownloadStream(projectId)

      await new Promise((resolve, reject) => {
        const validation = validateCsvFromStream(validationInputStream, project.pipeline)

        validation
          .on('progress', async progress => {
            await upLimit(() => updateProcessing(projectId, {
              validationProgress: {readRows: progress.readRows, readBytes: progress.readBytes, totalBytes: inputFile.size}
            }))
          })
          .on('error', async error => {
            await upLimit(() => updateProcessing(projectId, {
              validationError: error.message
            }))
            reject(new Error('Validation failed'))
          })
          .on('complete', async () => {
            totalRows = validation.readRows
            await upLimit(() => updateProcessing(projectId, {
              validationProgress: {readRows: validation.readRows, readBytes: validation.readBytes, totalBytes: inputFile.size}
            }))
            resolve()
          })
      })

      /* Geocoding */

      let readRows = 0

      await upLimit(() => updateProcessing(projectId, {
        step: 'geocoding',
        geocodingProgress: {readRows: 0, totalRows}
      }))

      const {columns} = await previewCsvFromStream(validationInputStream, project.pipeline)
      const {outputFormat} = project.pipeline
      const geocodeOptions = extractGeocodeOptions(project.pipeline.geocodeOptions, {columnsInFile: columns})

      const inputFileName = project.inputFile.filename
      const outputFileName = computeOutputFilename(inputFileName || 'result', outputFormat)

      const inputFileStream = await getInputFileDownloadStream(projectId)
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
              upLimit(() => updateProcessing(projectId, {
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
        await setOutputFile(projectId, outputFileName, fullGeocodeStream)
        // Update the progress one last time
        await upLimit(() => updateProcessing(projectId, {
          geocodingProgress: {readRows, totalRows}
        }))
      } catch (error) {
        await upLimit(() => updateProcessing(projectId, {
          geocodingError: error.message
        }))
        throw new Error('Geocoding failed')
      }

      await upLimit(() => endProcessing(projectId))

      console.log(`${projectId} | processed successfully`)
    } catch (error) {
      await endProcessing(projectId, error)

      console.log(`${projectId} | error during processing`)
      console.error(error)
    }
  }

  setInterval(async () => {
    for (let i = processingProjects.size; i < concurrency; i++) {
      limit(() => getNextJob())
    }

    const stalledProjects = await getStalledProjects()
    await Promise.all(stalledProjects.map(async projectId => {
      await resetProcessing(projectId)
      await askProcessing(projectId)
    }))
  }, 1000)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
