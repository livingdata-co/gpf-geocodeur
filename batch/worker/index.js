#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import 'dotenv/config.js'

import process from 'node:process'

import pLimit from 'p-limit'

import {GEOCODE_INDEXES} from '../../lib/config.js'
import {createIndexes} from '../../api/indexes/index.js'

import {processNext, getStalledProjects, resetProcessing, askProcessing} from '../models/project.js'

import {executeProcessing} from './execute.js'
import {getConcurrency} from './util.js'

async function main() {
  const indexes = createIndexes(GEOCODE_INDEXES)

  const concurrency = getConcurrency(process.env)
  const processingProjects = new Map()
  const limit = pLimit(1)

  async function getNextJob() {
    if (processingProjects.size >= concurrency) {
      return
    }

    const projectId = await processNext()

    if (!projectId) {
      limit.clearQueue()
      return
    }

    const abortController = new AbortController()
    processingProjects.set(projectId, {abortController})

    process.nextTick(async () => {
      await executeProcessing(projectId, {signal: abortController.signal, indexes})
      processingProjects.delete(projectId)
      limit(() => getNextJob())
    })
  }

  setInterval(async () => {
    for (let i = processingProjects.size; i < concurrency; i++) {
      limit(() => getNextJob())
    }

    const stalledProjects = await getStalledProjects()
    await Promise.all(stalledProjects.map(async projectId => {
      await resetProcessing(projectId)
      await askProcessing(projectId)
    }))
  }, 1000)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
