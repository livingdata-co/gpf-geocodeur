import {cpus} from 'node:os'

import logger from '../../lib/logger.js'

export function getConcurrency(env) {
  if (env.WORKERS_CONCURRENCY) {
    return Number.parseInt(env.WORKERS_CONCURRENCY, 10)
  }

  return cpus().length
}

export async function execIfLockAcquired(lockName, duration, model, fn) {
  const lock = await model.acquireLock(lockName, duration)

  if (!lock) {
    return
  }

  try {
    await fn()
  } catch (error) {
    logger.error(error)
  } finally {
    await model.releaseLock(lockName, lock)
  }
}
