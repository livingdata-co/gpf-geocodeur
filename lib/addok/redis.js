/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import path from 'node:path'
import {setTimeout} from 'node:timers/promises'
import {mkdir, rm} from 'node:fs/promises'
import {execa} from 'execa'
import {customAlphabet} from 'nanoid'
import Redis from 'ioredis'

import logger from '../logger.js'

const nanoid = customAlphabet('1234567890abcdef')

const PIDS_PATH = path.resolve('.', 'pids')

export async function createInstance(basePath, options = {}) {
  basePath = path.resolve(basePath)
  const instanceId = `${process.pid}-${nanoid(4)}`

  await mkdir(PIDS_PATH, {recursive: true})
  const redisSocketPath = path.join(PIDS_PATH, `redis-${instanceId}.sock`)

  await mkdir(basePath, {recursive: true})

  if (options.dropExistingDump) {
    await rm(path.join(basePath, 'dump.rdb'), {force: true})
  }

  const instance = execa('redis-server', ['--port', '0', '--save', '""', '--unixsocket', redisSocketPath, '--dir', basePath])
  instance.stdout.pipe(process.stdout)
  instance.stderr.pipe(process.stdout)

  function onExit(code, signal) {
    logger.log(`Redis instance ${instanceId} exited with code ${code} and signal ${signal}`)

    if (options.crashOnFailure) {
      logger.error('Redis has crashed. Now exiting…')
      process.exit(1)
    }
  }

  // Waiting for redis-server availability
  await new Promise((resolve, reject) => {
    function onData(data) {
      if (data.toString().toLowerCase().includes('ready to accept connections')) {
        instance.stdout.off('data', onData)
        instance.on('exit', onExit)
        resolve()
      }
    }

    instance.stdout.on('data', onData)

    setTimeout(() => {
      instance.stdout.off('data', onData)
      reject(new Error('redis-server init timeout'))
    }, 5000)
  })

  return {
    async close(options = {}) {
      if (options.save) {
        const client = new Redis(redisSocketPath)
        await client.save()
        await client.quit()
      }

      instance.off('exit', onExit)
      instance.kill()
    },

    socketPath: redisSocketPath
  }
}
