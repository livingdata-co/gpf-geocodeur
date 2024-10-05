import {setTimeout} from 'node:timers/promises'
import {Readable, Writable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import test from 'ava'
import createBatchTransform from '../batch-transform-stream.js'

// Helper function to create a writable stream to collect data
function createWritableStream() {
  const data = []
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      data.push(chunk)
      callback()
    }
  })

  stream.getData = () => data
  return stream
}

test('createBatchTransform / processes batches correctly', async t => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const handler = async batch => batch.map(item => item * 2)

  const inputStream = Readable.from(input)
  const outputStream = createWritableStream()
  const batchTransform = createBatchTransform(handler, 3, {concurrency: 2})

  await pipeline(inputStream, batchTransform, outputStream)
  const result = outputStream.getData()

  t.deepEqual(result, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
})

test('createBatchTransform / handles errors correctly', async t => {
  const handler = async () => {
    throw new Error('Error')
  }

  const inputStream = Readable.from([1, 2, 3])
  const outputStream = createWritableStream()
  const batchTransform = createBatchTransform(handler, 2, {concurrency: 1})

  await t.throwsAsync(() => pipeline(
    inputStream,
    batchTransform,
    outputStream
  ), {message: 'Error'})
})

test('createBatchTransform / handles concurrency correctly', async t => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const concurrency = 2
  let activeCount = 0
  let maxActiveCount = 0

  const handler = async batch => {
    activeCount++
    maxActiveCount = Math.max(maxActiveCount, activeCount)
    await setTimeout(100) // Simulate async processing
    activeCount--
    return batch.map(item => item * 2)
  }

  const inputStream = Readable.from(input)
  const outputStream = createWritableStream()
  const batchTransform = createBatchTransform(handler, 2, {concurrency})

  await pipeline(inputStream, batchTransform, outputStream)
  const result = outputStream.getData()

  t.is(maxActiveCount, concurrency)
  t.deepEqual(result, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
})

test('createBatchTransform / maintains order of items', async t => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const handler = async batch => {
    await setTimeout(1000 - (100 * batch[0])) // Simulate async processing. Decrease the timeout for each batch to produce a different order of arrival
    return batch.map(item => item * 2)
  }

  const inputStream = Readable.from(input)
  const outputStream = createWritableStream()
  const batchTransform = createBatchTransform(handler, 3, {concurrency: 2})

  await pipeline(inputStream, batchTransform, outputStream)
  const result = outputStream.getData()

  t.deepEqual(result, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
})
