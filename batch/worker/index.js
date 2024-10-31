#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import pLimit from 'p-limit'

import {GEOCODE_INDEXES} from '../../lib/config.js'
import logger from '../../lib/logger.js'
import {createIndexes} from '../../api/indexes/index.js'

import {initModel} from '../model/index.js'

import {executeProcessing} from './execute.js'
import {getConcurrency, execIfLockAcquired} from './util.js'

async function main() {
  const indexes = createIndexes(GEOCODE_INDEXES)

  const model = await initModel()

  const concurrency = getConcurrency(process.env)
  const processingProjects = new Map()
  const limit = pLimit(1)

  /* Handle aborted processing */

  const abortEmitter = await model.subscribeAbortedProcessing()

  abortEmitter.on('processing-aborted', async projectId => {
    const processing = processingProjects.get(projectId)

    if (processing) {
      processing.abortController.abort()
    }
  })

  async function getNextJob() {
    if (processingProjects.size >= concurrency) {
      return
    }

    const projectId = await model.processNext()

    if (!projectId) {
      limit.clearQueue()
      return
    }

    const abortController = new AbortController()
    processingProjects.set(projectId, {abortController})

    process.nextTick(async () => {
      await executeProcessing(projectId, {signal: abortController.signal, indexes, model})
      processingProjects.delete(projectId)
      limit(() => getNextJob())
    })
  }

  setInterval(async () => {
    // Start new jobs
    for (let i = processingProjects.size; i < concurrency; i++) {
      limit(() => getNextJob())
    }

    // Restart stalled jobs
    await execIfLockAcquired('restart-stalled-projects', 60_000, model, async () => {
      const stalledProjects = await model.getStalledProjects()
      await Promise.all(stalledProjects.map(async projectId => {
        await model.resetProcessing(projectId)
        await model.askProcessing(projectId)
      }))
    })

    // Flush old projects
    await execIfLockAcquired('flush-old-projects', 60_000, model, async () => {
      await model.flushOldProjects()
    })
  }, 1000)
}

try {
  await main()

  if (process.env.WORKER_PORT) {
    const app = express()

    app.get('/ping', (req, res) => {
      res.send('PONG!')
    })

    app.listen(process.env.WORKER_PORT, () => {
      logger.log(`Worker is listening on port ${process.env.WORKER_PORT}`)
    })
  }
} catch (error) {
  logger.error(error)
  process.exit(1)
}
