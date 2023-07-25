#!/usr/bin/env node
import 'dotenv/config.js'

import {packAndUpload} from '../../../../lib/scripts/publish-index/index.js'
import {PARCEL_INDEX_PATH} from '../../util/paths.js'

await packAndUpload('parcel', PARCEL_INDEX_PATH)
