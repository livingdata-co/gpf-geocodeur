import process from 'node:process'
import {pick} from 'lodash-es'

import {createClient} from '../../lib/indexes/client.js'

const {CAD_INDEX_URL} = process.env

const FILTERS = [
  'citycode',
  'postcode',
  'category'
]

export function prepareRequest(params) {
  const filters = pick(params, FILTERS)
  const center = params.lon !== undefined && params.lat !== undefined
    ? [params.lon, params.lat]
    : undefined

  return {
    q: params.q,
    center,
    filters,
    limit: Math.max(params.limit || 10, 10),
    returntruegeometry: params.returntruegeometry,
    geometry: params.searchgeom,
    autocomplete: params.autocomplete
  }
}

export default function createCadIndex(options = {}) {
  const client = createClient({
    indexUrl: options.cadIndexUrl || CAD_INDEX_URL
  })

  return {
    async search(params) {
      const requestBody = prepareRequest(params)
      return client.execRequest('search', requestBody)
    },

    async reverse(params) {
      const requestBody = prepareRequest(params)
      return client.execRequest('reverse', requestBody)
    },

    async autocomplete(params) {
      const requestBody = prepareRequest(params)
      return client.execRequest('search', requestBody)
    },

    async batch(params, options = {}) {
      const preparedRequests = params.requests.map(request => ({
        id: request.id,
        operation: request.operation,
        params: prepareRequest(request.params)
      }))

      const {results} = await client.execRequest('batch', {requests: preparedRequests}, options)

      return results
    }
  }
}
