import {pipeline} from 'node:stream/promises'
import {constants, access, mkdir, rm, stat} from 'node:fs/promises'
import {createReadStream, createWriteStream} from 'node:fs'
import {nanoid} from 'nanoid'
import createError from 'http-errors'

export function generateObjectKey(type) {
  const date = new Date().toISOString().slice(0, 10)

  return `${type}-${date}/${nanoid()}`
}

export function createStorage(options = {}) {
  if (!options.storageDir) {
    throw new Error('storageDir option is required')
  }

  const {storageDir} = options.storageDir

  async function createDownloadStream(objectKey) {
    const filePath = new URL(objectKey, storageDir)
    await access(filePath, constants.R_OK)
    return createReadStream(filePath)
  }

  async function getFileSize(objectKey) {
    const filePath = new URL(objectKey, storageDir)
    const stats = await stat(filePath)
    return stats.size
  }

  async function uploadFile(inputStream, objectType, fileSize = 0) {
    await mkdir(storageDir, {recursive: true})
    await access(storageDir, constants.W_OK)

    const objectKey = generateObjectKey(objectType)

    const filePath = new URL(objectKey, storageDir)

    const parentDirPath = new URL('.', filePath)
    await mkdir(parentDirPath, {recursive: true})

    const fileWriteStream = createWriteStream(filePath)
    await pipeline(inputStream, fileWriteStream)

    if (fileSize) {
      const uploadedFileSize = await getFileSize(filePath)

      if (uploadedFileSize !== fileSize) {
        await deleteFile(objectKey)
        throw createError(403, 'File size mismatch')
      }
    }

    return objectKey
  }

  async function deleteFile(objectKey) {
    const filePath = new URL(objectKey, storageDir)
    await rm(filePath)
  }

  return {
    createDownloadStream, uploadFile, deleteFile, getFileSize
  }
}
