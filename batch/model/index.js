import * as Project from './project.js'
import * as Community from './community.js'
import * as Lock from './lock.js'

import redis from '../util/redis.js'
import storage from './storage/index.js'

export async function initModel() {
  const methods = {}
  const redisInstance = redis()
  const redisSubscribeClient = redisInstance.duplicate()

  for (const [key, value] of Object.entries({...Project, ...Community, ...Lock})) {
    if (typeof value !== 'function') {
      continue
    }

    methods[key] = async (...args) => value(...args, {
      redis: redisInstance,
      subscriber: redisSubscribeClient,
      storage
    })
  }

  return methods
}

