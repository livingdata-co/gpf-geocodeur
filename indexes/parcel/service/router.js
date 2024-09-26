import {Router, json} from 'express'

import w from '../../../lib/w.js'
import errorHandler from '../../../lib/error-handler.js'
import {createRtree} from '../../../lib/spatial-index/rtree.js'
import {createInstance} from '../../../lib/spatial-index/lmdb.js'
import {batch} from '../../../lib/batch.js'

import {PARCEL_INDEX_RTREE_PATH, PARCEL_INDEX_MDB_PATH} from '../util/paths.js'

import {search, reverse} from './search.js'

export async function createRouter() {
  const db = await createInstance(PARCEL_INDEX_MDB_PATH, {
    geometryType: 'Polygon',
    readOnly: true,
    cache: true
  })

  const rtreeIndex = await createRtree(PARCEL_INDEX_RTREE_PATH)

  const router = new Router()

  router.use(json())

  router.post('/search', w((req, res) => {
    res.send(search(req.body, {db, rtreeIndex}))
  }))

  router.post('/reverse', w((req, res) => {
    res.send(reverse(req.body, {db, rtreeIndex}))
  }))

  router.post('/batch', w(batch({
    operations: {
      search: (params, options) => search({...params, limit: 2, batch: true}, {...options, db, rtreeIndex}),
      reverse: (params, options) => reverse({...params, limit: 2}, {...options, db, rtreeIndex})
    }
  })))

  router.use(errorHandler)

  return router
}
