import {Transform} from 'node:stream'

class BatchTransform extends Transform {
  constructor(handler, batchSize, options = {}) {
    super({...options, objectMode: true})

    this.handler = handler
    this.batchSize = batchSize
    this.concurrency = options.concurrency || 1

    // Array to store the upcoming items until the batch is full
    this.currentBatch = []

    // Reference to the next batch to process
    this.nextBatch = null

    // Reference to the callback to call when the next batch will be processed
    this.callback = null

    // Array to store the processing entries (promise and results)
    this.processingQueue = []

    // Number of active promises
    this.activePromisesCount = 0
  }

  _transform(item, encoding, callback) {
    // Store incoming item in the current batch
    this.currentBatch.push(item)

    // If the batch is full, process it and forward callback. Otherwise, just call the callback
    if (this.currentBatch.length >= this.batchSize) {
      const batchToProcess = this.currentBatch
      this.currentBatch = []
      this._enqueueBatch(batchToProcess, callback)
    } else {
      callback()
    }
  }

  _flush(callback) {
    // If there are items in the current batch, process it and forward callback. Otherwise, just call the callback
    if (this.currentBatch.length > 0) {
      this._enqueueBatch(this.currentBatch, error => {
        if (error) {
          return callback(error)
        }

        this._executeCallbackOnFlush(callback)
      })
    } else {
      this._executeCallbackOnFlush(callback)
    }
  }

  _enqueueBatch(batch, callback) {
    this.nextBatch = batch
    this._processNextBatch()

    // If there is less active processing than concurrency limit, call the callback. Otherwise, pause the transform stream and store the callback for later
    if (this.activePromisesCount < this.concurrency) {
      callback()
    } else {
      this.callback = callback
    }
  }

  _executeCallback(error) {
    // If there is a callback stored, call it and reset it
    if (this.callback) {
      const {callback} = this
      this.callback = null
      callback(error)
    }
  }

  _executeCallbackOnFlush(callback) {
    // If there are no active processing, call the callback. Otherwise, store the callback for later
    if (this.activePromisesCount === 0) {
      callback()
    } else {
      this.callback = callback
    }
  }

  _processNextBatch() {
    // If there is a next batch and there is room for processing, process it
    if (this.nextBatch && this.activePromisesCount < this.concurrency) {
      const batch = this.nextBatch
      this.nextBatch = null
      this._processBatch(batch)
    }
  }

  async _processBatch(batch) {
    // Increment the active promises count
    this.activePromisesCount++

    const processingEntry = {}

    try {
      // Call the handler with the batch
      const promise = this.handler(batch)

      // Store the promise in the processing entry
      processingEntry.promise = promise
      this.processingQueue.push(processingEntry)

      // Wait for the promise to resolve and store the results in the processing entry
      const results = await promise
      processingEntry.results = results

      // Decrement the active promises count, push the results and execute the callback
      this.activePromisesCount--
      this._pushResults()
      this._executeCallback()
    } catch (error) {
      // Same as above, but with an error
      this.activePromisesCount--
      this._executeCallback(error)
    } finally {
      // Process the next batch (eventually)
      this._processNextBatch()
    }
  }

  _pushResults() {
    // While there are processing entries with results on top of the queue, push the results and remove the entry
    // This is to ensure that the results are pushed in the right order even if the promises resolve in a different order
    while (this.processingQueue.length > 0 && this.processingQueue[0].results) {
      const {results} = this.processingQueue[0]

      for (const result of results) {
        this.push(result)
      }

      this.processingQueue.shift()
    }
  }
}

export default function batchTransform(handler, batchSize, options) {
  return new BatchTransform(handler, batchSize, options)
}
