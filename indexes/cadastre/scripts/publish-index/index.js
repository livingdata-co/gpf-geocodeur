#!/usr/bin/env node
import 'dotenv/config.js'

import {packAndUpload, computeArchiveUrl, updateLatestResolver} from '../../../../lib/scripts/publish-index/index.js'
import {POI_INDEX_PATH} from '../../util/paths.js'

const objectKey = await packAndUpload('poi', POI_INDEX_PATH)
const archiveUrl = computeArchiveUrl(objectKey)

if (archiveUrl) {
  await updateLatestResolver('poi', archiveUrl)
}
