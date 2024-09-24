import process from 'node:process'
import path from 'node:path'
import {Router, json} from 'express'
import {createCluster} from 'addok-cluster'

import w from '../../../lib/w.js'
import errorHandler from '../../../lib/error-handler.js'
import {createRtree} from '../../../lib/spatial-index/rtree.js'
import {createInstance as createRedisServer} from '../../../lib/addok/redis.js'
import {batch} from '../../../lib/batch.js'

import {ADDRESS_INDEX_RTREE_PATH, ADDRESS_INDEX_PATH} from '../util/paths.js'

import {createDatabase} from './db.js'
import {search} from './search.js'
import {reverse} from './reverse.js'

const ADDOK_REQUEST_TIMEOUT = process.env.ADDOK_REQUEST_TIMEOUT
  ? Number.parseInt(process.env.ADDOK_REQUEST_TIMEOUT, 10)
  : 2000

export async function createRouter() {
  const db = await createDatabase()
  const rtreeIndex = await createRtree(ADDRESS_INDEX_RTREE_PATH)
  const redisServer = await createRedisServer(ADDRESS_INDEX_PATH, {crashOnFailure: true})
  const addokCluster = await createCluster({
    addokRedisUrl: ['unix:' + redisServer.socketPath],
    addokConfigModule: path.resolve('./indexes/address/config/addok.conf'),
    requestTimeout: ADDOK_REQUEST_TIMEOUT
  })

  const router = new Router()

  router.use(json())

  router.post('/search', w(async (req, res) => {
    res.send(await search(req.body, {addokCluster}))
  }))

  router.post('/reverse', w(async (req, res) => {
    res.send(await reverse(req.body, {db, rtreeIndex}))
  }))

  router.post('/batch', w(batch({
    operations: {
      search: (params, options) => search(params, {...options, addokCluster, priority: 'low'}),
      reverse: (params, options) => reverse(params, {...options, db, rtreeIndex})
    }
  })))

  router.get('/inspect', w(async (req, res) => {
    const addokInfo = await addokCluster.inspect()
    res.send({addok: addokInfo})
  }))

  router.use(errorHandler)

  return router
}
