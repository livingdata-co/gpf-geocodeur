import path from 'node:path'
import {rm, readdir, stat} from 'node:fs/promises'

import logger from './logger.js'

const DEFAULT_EXPIRATION_DELAY = 1000 * 60 * 15 // 15 minutes
const DEFAULT_AUTOCLEANUP_INTERVAL = 1000 * 60 // 1 minute

export async function cleanupOldFiles(directoryPath, expirationDelay = DEFAULT_EXPIRATION_DELAY) {
  const files = await readdir(directoryPath)

  await Promise.all(files.map(async file => {
    try {
      const filePath = path.join(directoryPath, file)
      const {birthtime} = await stat(filePath)
      const expirationTime = birthtime.getTime() + expirationDelay

      if (Date.now() > expirationTime) {
        await rm(filePath)
      }
    } catch (error) {
      logger.error(error)
    }
  }))
}

export function startAutoCleanup(directoryPath, expirationDelay = DEFAULT_EXPIRATION_DELAY, autoCleanupInterval = DEFAULT_AUTOCLEANUP_INTERVAL) {
  cleanupOldFiles(directoryPath, expirationDelay)
  setInterval(() => cleanupOldFiles(directoryPath, expirationDelay), autoCleanupInterval)
}
