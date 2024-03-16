import path from 'node:path'
import {execa} from 'execa'

import logger from '../logger.js'

import {createInstance as createRedisServer} from './redis.js'

export async function createImporter(destPath, addokConfigFile) {
  destPath = path.resolve(destPath)
  addokConfigFile = path.resolve(addokConfigFile)

  const redisServer = await createRedisServer(destPath, {dropExistingDump: true})

  logger.log(' * Started Redis server')

  const addokEnv = {
    ADDOK_CONFIG_MODULE: path.resolve(addokConfigFile),
    REDIS_SOCKET: redisServer.socketPath
  }

  async function finish() {
    logger.log(' * Computing ngrams…')
    await execa('addok', ['ngrams'], {env: addokEnv})

    logger.log(' * Dumping Redis database on disk…')
    await redisServer.close({save: true})
  }

  async function batchImport(readableStream) {
    await execa('addok', ['batch'], {env: addokEnv, input: readableStream})
  }

  return {
    batchImport,
    finish
  }
}
