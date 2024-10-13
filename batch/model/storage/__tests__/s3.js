import {Readable} from 'node:stream'
import test from 'ava'
import sinon from 'sinon'
import {S3} from '@aws-sdk/client-s3'
import {Upload} from '@aws-sdk/lib-storage'
import {generateObjectKey, createStorage} from '../s3.js'

// Mock AWS S3 client
const mockClient = sinon.stub(S3.prototype, 'send')

// Test de la fonction generateObjectKey
test('generateObjectKey génère une clé avec un type et une date', t => {
  const type = 'image'
  const objectKey = generateObjectKey(type)

  t.regex(objectKey, new RegExp(`^${type}-\\d{4}-\\d{2}-\\d{2}/`))
})

// Test de la fonction createStorage
test('createStorage initialise un client S3 avec les bonnes options', t => {
  const options = {
    region: 'us-west-1',
    endpoint: 'https://s3.example.com',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    bucket: 'test-bucket'
  }

  const storage = createStorage(options)
  t.truthy(storage.createDownloadStream)
  t.truthy(storage.uploadFile)
  t.truthy(storage.deleteFile)
  t.truthy(storage.getFileSize)
})

// Test de la fonction createDownloadStream
test('createDownloadStream renvoie le stream du fichier téléchargé', async t => {
  const storage = createStorage({bucket: 'test-bucket'})
  const objectKey = 'test-key'

  mockClient.resolves({Body: Readable.from('file content')})

  const stream = await storage.createDownloadStream(objectKey)
  t.truthy(stream instanceof Readable)
})

// Test de la fonction uploadFile
test('uploadFile envoie un fichier et renvoie la clé générée', async t => {
  const storage = createStorage({bucket: 'test-bucket'})
  const inputStream = Readable.from('file content')
  const objectType = 'image'

  sinon.stub(Upload.prototype, 'done').resolves()

  const objectKey = await storage.uploadFile(inputStream, objectType)
  t.regex(objectKey, new RegExp(`^${objectType}-\\d{4}-\\d{2}-\\d{2}/`))
})

// Test de la fonction deleteFile
test('deleteFile supprime le fichier avec la clé donnée', async t => {
  const storage = createStorage({bucket: 'test-bucket'})
  const objectKey = 'test-key'

  mockClient.resolves()

  await storage.deleteFile(objectKey)
  t.pass()
})
