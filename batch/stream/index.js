import logger from '../../lib/logger.js'

import batchTransform from '../util/batch-transform-stream.js'

import {createEmptyResultItem, expandItemWithResult} from './results.js'
import {prepareParams} from './params.js'

export function createGeocodeStream(geocodeOptions, options = {}) {
  const {indexes, signal, batch} = options
  const concurrency = options.concurrency || 1

  async function handler(items) {
    const preparedRequests = items.map(item => prepareRequest(item, {
      reverse: geocodeOptions.operation === 'reverse',
      ...geocodeOptions
    }))

    const emptyResultItem = createEmptyResultItem(
      geocodeOptions.indexes,
      geocodeOptions.operation
    )

    try {
      const batchResults = await batch({
        indexes: geocodeOptions.indexes,
        requests: preparedRequests.filter(Boolean) // Remove null values
      }, {indexes, signal})

      return items.map((item, i) => {
        const resultItem = preparedRequests[i] ? batchResults.shift() : {status: 'skipped', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.result_columns)
      })
    } catch (error) {
      logger.error(error)

      return items.map(item => {
        const resultItem = {status: 'error', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.result_columns)
      })
    }
  }

  return batchTransform(handler, 100, {concurrency, signal})
}

export function prepareRequest(item, options) {
  const params = prepareParams(item, options)

  if (!params) {
    return null
  }

  return {
    id: item.id,
    operation: options.reverse ? 'reverse' : 'search',
    params
  }
}
