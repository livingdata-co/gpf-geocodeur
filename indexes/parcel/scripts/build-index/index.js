#!/usr/bin/env node
/* eslint no-await-in-loop: off */
import 'dotenv/config.js'

import process from 'node:process'

import {downloadAndExtract, getArchiveURL} from '../../../../lib/geoservices.js'
import {computeDepartements} from '../../../../lib/cli.js'
import {createIndexer} from '../../../../lib/spatial-index/indexer.js'

import {PARCEL_INDEX_MDB_BASE_PATH} from '../../util/paths.js'

import {readFeatures} from './gdal.js'
import {transformParcel} from './transform.js'

const {PARCELLAIRE_EXPRESS_URL} = process.env

const indexer = await createIndexer(PARCEL_INDEX_MDB_BASE_PATH, {geometryType: 'Polygon'})

for (const codeDepartement of computeDepartements('parcel')) {
  console.log(`Index parcel data for departement ${codeDepartement}`)

  const archiveUrl = getArchiveURL(PARCELLAIRE_EXPRESS_URL, codeDepartement)
  console.log('Downloading and extracting archive')

  let parcellaireArchive

  try {
    parcellaireArchive = await downloadAndExtract(archiveUrl)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  const parcelleShpPath = await parcellaireArchive.getPath('PARCELLE.SHP')

  console.log('Indexing into LMDB')
  await indexer.writeFeatures(readFeatures(parcelleShpPath, transformParcel))

  await parcellaireArchive.cleanup()
}

console.log('Finishing indexation')

await indexer.finish()
