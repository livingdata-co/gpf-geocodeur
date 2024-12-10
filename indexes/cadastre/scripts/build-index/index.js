#!/usr/bin/env node
/* eslint no-await-in-loop: off */
import 'dotenv/config.js'

import path from 'node:path'
import {createReadStream} from 'node:fs'
import {copyFile} from 'node:fs/promises'
import {Transform} from 'node:stream'

import {parse, stringify} from 'ndjson'
import {omit} from 'lodash-es'

import {createImporter} from '../../../../lib/addok/importer.js'
import {createIndexer} from '../../../../lib/spatial-index/indexer.js'
import {CAD_INDEX_MDB_BASE_PATH, CAD_INDEX_PATH, CAD_DATA_PATH, CAD_DATA_CATEGORIES_PATH, CAD_INDEX_CATEGORIES_PATH} from '../../util/paths.js'
import {extractFeatures} from './extract.js'

const INPUT_FILE = path.join(CAD_DATA_PATH, 'cadastre.ndjson')

let indexer_counter = 0;
const indexer = await createIndexer(CAD_INDEX_MDB_BASE_PATH, {
  geometryType: 'Mixed',
  idFn: p =>{
    indexer_counter +=1;
    if(p.nic) return p.nic;
    if(!p.extrafields || !p.extrafields.cleabs) return indexer_counter;
    return p.extrafields.cleabs;
  } ,
  shouldUseTileIndexFn({properties}) {
    return properties.category.includes('administratif') || properties.category.includes('cours d\'eau')
  }
})

await indexer.writeFeatures(extractFeatures(INPUT_FILE))

const addokImporter = await createImporter(CAD_INDEX_PATH, './indexes/cadastre/config/addok.conf')

// Importing into addok
let counter = 0;
await addokImporter.batchImport(
  createReadStream(INPUT_FILE)
    .pipe(parse())
    .pipe(new Transform({
      transform(row, enc, cb) {
        const obj = omit(row, ['truegeometry', 'toponym', 'extrafields', 'classification'])
        counter += 1;
        if(row.nic){
          obj.id = row.nic;
        }
        else{
          obj.id = (row.extrafields && row.extrafields.cleabs != undefined) ? row.extrafields.cleabs: counter;
        }
        cb(null, obj)
      },
      objectMode: true
    }))
    .pipe(stringify())
)

// Copy categories file
await copyFile(CAD_DATA_CATEGORIES_PATH, CAD_INDEX_CATEGORIES_PATH)

await indexer.finish()
await addokImporter.finish()
