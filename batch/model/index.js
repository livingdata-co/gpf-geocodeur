import * as Project from './project.js'

import redis from '../util/redis.js'
import storage from './storage/index.js'

export async function initModel() {
  const methods = {}
  const redisInstance = redis()

  for (const [key, value] of Object.entries(Project)) {
    if (typeof value !== 'function') {
      continue
    }

    methods[key] = async (...args) => value(...args, {redis: redisInstance, storage})
  }

  return methods
}

