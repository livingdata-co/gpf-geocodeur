import path from 'node:path'
import {Router, json} from 'express'
import {createCluster} from 'addok-cluster'

import w from '../../../lib/w.js'
import errorHandler from '../../../lib/error-handler.js'
import {createRtree} from '../../../lib/spatial-index/rtree.js'
import {createInstance as createRedisServer} from '../../../lib/addok/redis.js'

import {ADDRESS_INDEX_RTREE_PATH, ADDRESS_INDEX_PATH} from '../util/paths.js'

import {createDatabase} from './db.js'
import {search} from './search.js'
import {reverse} from './reverse.js'

export async function createRouter() {
  const db = await createDatabase()
  const rtreeIndex = await createRtree(ADDRESS_INDEX_RTREE_PATH)
  const redisServer = await createRedisServer(ADDRESS_INDEX_PATH, {crashOnFailure: true})
  const addokCluster = await createCluster({
    addokRedisUrl: ['unix:' + redisServer.socketPath],
    addokConfigModule: path.resolve('./indexes/address/config/addok.conf')
  })

  const router = new Router()

  router.use(json())

  router.post('/search', w(async (req, res) => {
    res.send(await search(req.body, {addokCluster}))
  }))

  router.post('/reverse', w(async (req, res) => {
    res.send(await reverse(req.body, {db, rtreeIndex}))
  }))

  router.use(errorHandler)

  return router
}
