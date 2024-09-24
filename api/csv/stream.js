import logger from '../../lib/logger.js'

import batchTransform from '../util/batch-transform-stream.js'

import {createEmptyResultItem, expandItemWithResult} from './results.js'
import {prepareParams} from './params.js'

export function createGeocodeStream(geocodeOptions, {operation, indexes, signal, batch}) {
  async function handler(items) {
    const preparedRequests = items.map(item => prepareRequest(item, {
      reverse: operation === 'reverse',
      columns: geocodeOptions.columns,
      citycode: geocodeOptions.citycode,
      postcode: geocodeOptions.postcode,
      type: geocodeOptions.type,
      lat: geocodeOptions.lat,
      lon: geocodeOptions.lon
    }))

    const emptyResultItem = createEmptyResultItem(geocodeOptions.indexes, operation)

    try {
      const batchResults = await batch({
        indexes: geocodeOptions.indexes,
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
    id: item.id,
    operation: options.reverse ? 'reverse' : 'search',
    params
  }
}
