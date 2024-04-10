#!/usr/bin/env node
/* eslint no-await-in-loop: off */
import 'dotenv/config.js'

import path from 'node:path'
import process from 'node:process'
import {finished} from 'node:stream/promises'
import {Readable} from 'node:stream'
import {createWriteStream} from 'node:fs'
import {mkdir, writeFile} from 'node:fs/promises'

import logger from '../../../../lib/logger.js'
import {downloadAndExtract, getArchiveURL} from '../../../../lib/geoservices.js'
import {computeDepartements} from '../../../../lib/cli.js'

import {POI_DATA_PATH, POI_DATA_CATEGORIES_PATH} from '../../util/paths.js'

import {LAYERS, COMPUTED_FIELDS_SCHEMA, MAIN_CATEGORIES} from './mapping.js'
import {createCommunesIndex} from './communes.js'
import {createAccumulator} from './categories.js'
import {extractFeatures} from './extract.js'

const {BDTOPO_URL} = process.env

const communesIndex = await createCommunesIndex()
const cleabsUniqIndex = new Set()
const categoriesAccumulator = createAccumulator(MAIN_CATEGORIES)

await mkdir(POI_DATA_PATH, {recursive: true})
const outputFile = createWriteStream(path.join(POI_DATA_PATH, 'poi.ndjson'), {encoding: 'utf8'})

for (const codeDepartement of computeDepartements('poi')) {
  logger.log(`Index POI data for departement ${codeDepartement}`)

  const archiveUrl = getArchiveURL(BDTOPO_URL, codeDepartement)
  logger.log(`Downloading and extracting archive ${archiveUrl}`)
  let bdtopoArchive

  try {
    bdtopoArchive = await downloadAndExtract(archiveUrl)
  } catch (error) {
    logger.error(error.message)
    process.exit(1)
  }

  const datasetPath = await bdtopoArchive.getPath('BDT_3-3_GPKG_*.gpkg')

  logger.log('Extracting features from dataset')

  const featureStream = Readable.from(extractFeatures({
    datasetPath,
    computedFieldsSchema: COMPUTED_FIELDS_SCHEMA,
    layersDefinitions: LAYERS,
    cleabsUniqIndex,
    communesIndex,
    categoriesAccumulator,
    codeDepartement
  }))

  featureStream.pipe(outputFile, {end: false})
  await finished(featureStream)

  await bdtopoArchive.cleanup()
}

await writeFile(
  POI_DATA_CATEGORIES_PATH,
  JSON.stringify(categoriesAccumulator.getSummary())
)

outputFile.end()
await finished(outputFile)

await communesIndex.close()
