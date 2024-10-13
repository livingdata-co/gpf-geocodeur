import process from 'node:process'

import {createStorage as createS3Storage} from './s3.js'
import {createStorage as createFSStorage} from './fs.js'

function createStorageFromEnvironment(env) {
  const {
    STORAGE_FS_DIR,
    STORAGE_S3_REGION,
    STORAGE_S3_ENDPOINT,
    STORAGE_S3_ACCESS_KEY,
    STORAGE_S3_SECRET_KEY,
    STORAGE_S3_BUCKET_NAME
  } = env

  if (STORAGE_S3_BUCKET_NAME) {
    return createS3Storage({
      region: STORAGE_S3_REGION,
      endpoint: STORAGE_S3_ENDPOINT,
      accessKeyId: STORAGE_S3_ACCESS_KEY,
      secretAccessKey: STORAGE_S3_SECRET_KEY,
      bucket: STORAGE_S3_BUCKET_NAME
    })
  }

  if (STORAGE_FS_DIR) {
    return createFSStorage({
      storageDir: new URL(STORAGE_FS_DIR, 'file://' + process.cwd() + '/')
    })
  }

  throw new Error('No storage configuration found')
}

const storage = createStorageFromEnvironment(process.env)

export default storage
