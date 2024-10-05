import {Readable} from 'node:stream'
import {S3, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand} from '@aws-sdk/client-s3'
import {Upload} from '@aws-sdk/lib-storage'
import {nanoid} from 'nanoid'
import createError from 'http-errors'

export function generateObjectKey(type) {
  const date = new Date().toISOString().slice(0, 10)

  return `${type}-${date}/${nanoid()}`
}

export function createStorage(options = {}) {
  const {region, endpoint, accessKeyId, secretAccessKey, bucket} = options

  const client = new S3({
    region,
    endpoint,
    s3BucketEndpoint: true,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })

  async function createDownloadStream(objectKey) {
    const command = new GetObjectCommand({Bucket: bucket, Key: objectKey})
    const downloadStream = await client.send(command)
    return downloadStream.Body
  }

  async function getFileSize(objectKey) {
    const command = new HeadObjectCommand({Bucket: bucket, Key: objectKey})
    const response = await client.send(command)
    return response.ContentLength
  }

  async function uploadFile(inputStream, objectType, fileSize = 0) {
    const objectKey = generateObjectKey(objectType)

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: objectKey,
        Body: inputStream instanceof Readable ? inputStream : Readable.toWeb(inputStream)
      }
    })

    await upload.done()

    if (fileSize) {
      const uploadedFileSize = await getFileSize(objectKey)
      if (uploadedFileSize !== fileSize) {
        await deleteFile(objectKey)
        throw createError(403, 'File size mismatch')
      }
    }

    return objectKey
  }

  async function deleteFile(objectKey) {
    const command = new DeleteObjectCommand({Bucket: bucket, Key: objectKey})
    await client.send(command)
  }

  return {
    createDownloadStream, uploadFile, deleteFile, getFileSize
  }
}
