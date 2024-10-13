#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import 'dotenv/config.js'

import process from 'node:process'

import pLimit from 'p-limit'

import {GEOCODE_INDEXES} from '../../lib/config.js'
import logger from '../../lib/logger.js'
import {createIndexes} from '../../api/indexes/index.js'

import {initModel} from '../model/index.js'

import {executeProcessing} from './execute.js'
import {getConcurrency} from './util.js'

async function main() {
  const indexes = createIndexes(GEOCODE_INDEXES)

  const model = await initModel()

  const concurrency = getConcurrency(process.env)
  const processingProjects = new Map()
  const limit = pLimit(1)

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
    for (let i = processingProjects.size; i < concurrency; i++) {
      limit(() => getNextJob())
    }

    const stalledProjects = await model.getStalledProjects()
    await Promise.all(stalledProjects.map(async projectId => {
      await model.resetProcessing(projectId)
      await model.askProcessing(projectId)
    }))
  }, 1000)
}

try {
  await main()
} catch (error) {
  logger.error(error)
  process.exit(1)
}
