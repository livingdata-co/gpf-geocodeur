#!/usr/bin/env node
/* eslint no-await-in-loop: off */
import 'dotenv/config.js'

import process from 'node:process'
import {createGunzip} from 'node:zlib'
import got from 'got'
import {createIndexer} from '../../../../lib/spatial-index/indexer.js'
import {createImporter} from '../../../../lib/addok/importer.js'
import {computeDepartements} from '../../../../lib/cli.js'
import {ADDRESS_INDEX_PATH, ADDRESS_INDEX_MDB_BASE_PATH} from '../../util/paths.js'
import {extractFeatures} from './extract.js'

const {BAN_ADDOK_URL} = process.env

export function getFileUrl(codeDepartement) {
  return BAN_ADDOK_URL.replace('{dep}', codeDepartement)
}

const addokImporter = await createImporter(ADDRESS_INDEX_PATH, './indexes/address/config/addok.conf')
const indexer = await createIndexer(ADDRESS_INDEX_MDB_BASE_PATH, {geometryType: 'Point'})

for (const codeDepartement of computeDepartements('address')) {
  console.log(`Index address data for departement ${codeDepartement}`)

  const fileUrl = getFileUrl(codeDepartement)

  console.log('Indexing into LMDB')
  try {
    await indexer.writeFeatures(extractFeatures(fileUrl))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log('Indexing into addok')
  await addokImporter.batchImport(
    got.stream(fileUrl)
      .pipe(createGunzip())
  )
}

console.log('Finishing spatial indexation computation')
await indexer.finish()

console.log('Finishing addok importation')
await addokImporter.finish()
