#!/usr/bin/env node
import 'dotenv/config.js'
import process from 'node:process'
import {rm, mkdir} from 'node:fs/promises'

import {downloadAndUnpack, resolveArchiveUrl} from '../../../../lib/scripts/download-index/index.js'
import {CAD_INDEX_PATH} from '../../util/paths.js'

const archiveUrl = await resolveArchiveUrl(
  process.env.CAD_ARCHIVE_URL,
  process.env.CAD_ARCHIVE_URL_RESOLVER
)
await rm(CAD_INDEX_PATH, {recursive: true, force: true})
await mkdir(CAD_INDEX_PATH, {recursive: true})
await downloadAndUnpack(archiveUrl, CAD_INDEX_PATH)
