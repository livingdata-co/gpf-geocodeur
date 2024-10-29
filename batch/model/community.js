import createHttpError from 'http-errors'

import {BATCH_ASYNC_DEFAULT_COMMUNITY_PARAMS} from '../../lib/config.js'

import {hydrateObject, prepareObject} from '../util/redis.js'

const communitySchema = {
  id: 'string',
  name: 'string',
  params: 'object'
}

export async function upsertCommunity(community, {redis}) {
  const {id, name} = community

  const existingCommunity = await redis.hgetall(`community:${id}`)

  if (existingCommunity?.id && existingCommunity.name !== name) {
    await redis.hset(`community:${id}`, 'name', name)
  }

  if (!existingCommunity?.id) {
    await redis
      .pipeline()
      .hset(`community:${id}`, prepareObject({
        id,
        name,
        params: BATCH_ASYNC_DEFAULT_COMMUNITY_PARAMS
      }))
      .rpush('communities', id)
      .exec()
  }

  return getCommunity(id, {redis})
}

export async function getCommunity(id, {redis}) {
  const community = await redis.hgetall(`community:${id}`)

  if (!community?.id) {
    throw createHttpError(404, `Community ${id} not found`)
  }

  return hydrateObject(community, communitySchema)
}

export async function getCommunities({redis}) {
  const communities = await redis.lrange('communities', 0, -1)
  return Promise.all(communities.map(async id => getCommunity(id, {redis})))
}

export async function updateCommunityParams(id, params, {redis}) {
  validateParams(params)

  const community = await redis.hgetall(`community:${id}`)

  if (!community?.id) {
    throw createHttpError(404, `Community ${id} not found`)
  }

  await redis.hset(`community:${id}`, 'params', JSON.stringify(params))
}

export async function deleteCommunity(id, {redis}) {
  await redis
    .pipeline()
    .del(`community:${id}`)
    .lrem('communities', 0, id)
    .exec()
}

const ALLOWED_MAX_INPUT_FILE_SIZE = new Set([
  '50MB',
  '100MB',
  '200MB',
  '500MB',
  '1GB'
])

const ALLOWED_CONCURRENCY = new Set([1, 2, 4])

export function validateParams(params) {
  const keys = Object.keys(params)

  if (keys.length !== 2 || !keys.includes('maxInputFileSize') || !keys.includes('concurrency')) {
    throw createHttpError(400, 'params must have exactly 2 keys: maxInputFileSize and concurrency')
  }

  const {maxInputFileSize, concurrency} = params

  if (!ALLOWED_MAX_INPUT_FILE_SIZE.has(maxInputFileSize)) {
    throw createHttpError(400, 'maxInputFileSize not valid')
  }

  if (!ALLOWED_CONCURRENCY.has(concurrency)) {
    throw createHttpError(400, 'concurrency not valid')
  }
}
