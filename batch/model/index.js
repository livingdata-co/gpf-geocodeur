import process from 'node:process'

import * as Project from './project.js'
import * as Community from './community.js'
import * as Lock from './lock.js'

import redis from '../util/redis.js'
import {createStorageFromEnvironment} from './storage/index.js'

export async function initModel(options = {}) {
  const methods = {}
  const redisInstance = options.redis || redis()
  const redisSubscribeClient = redisInstance.duplicate()
  const storage = options.storage || await createStorageFromEnvironment(process.env)

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

