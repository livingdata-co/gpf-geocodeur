import logger from '../../lib/logger.js'

import batchTransform from '../util/batch-transform-stream.js'
import batch from '../operations/batch.js'

import {createEmptyResultItem, expandItemWithResult} from './results.js'
import {prepareParams} from './params.js'

export function createGeocodeStream(geocodeOptions, {operation, indexes, signal}) {
  async function handler(items) {
    const preparedRequests = items.map(item => prepareRequest(item, {
      reverse: operation === 'reverse',
      columns: geocodeOptions.columns,
      citycode: geocodeOptions.citycode,
      postcode: geocodeOptions.postcode,
      lat: geocodeOptions.lat,
      lon: geocodeOptions.lon
    }))

    const emptyResultItem = createEmptyResultItem(operation)

    try {
      const batchResults = await batch({
        requests: preparedRequests.filter(Boolean) // Remove null values
      }, {indexes, signal})

      return items.map((item, i) => {
        const resultItem = preparedRequests[i] ? batchResults.shift() : {status: 'skipped', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.resultColumns)
      })
    } catch (error) {
      logger.error(error)

      return items.map(item => {
        const resultItem = {status: 'error', result: {}}
        return expandItemWithResult(item, resultItem, emptyResultItem, geocodeOptions.resultColumns)
      })
    }
  }

  return batchTransform(handler, 100, {concurrency: 2, signal})
}

export function prepareRequest(item, options) {
  const params = prepareParams(item, options)

  if (!params) {
    return null
  }

  return {
    operation: options.reverse ? 'reverse' : 'search',
    params
  }
}
