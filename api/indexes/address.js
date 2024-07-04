import process from 'node:process'
import {pick} from 'lodash-es'

import {createClient} from '../../lib/indexes/client.js'

const {ADDRESS_INDEX_URL} = process.env

const FILTERS = [
  'citycode',
  'postcode',
  'type'
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
    geometry: params.searchgeom,
    returntruegeometry: params.returntruegeometry,
    autocomplete: params.autocomplete
  }
}

export default function createAddressIndex(options = {}) {
  const client = createClient({
    indexUrl: options.addressIndexUrl || ADDRESS_INDEX_URL,
    prepareRequest
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

    async batch(requests) {
      const preparedRequests = requests.map(r => ({
        operation: r.operation,
        params: prepareRequest(r.params)
      }))

      return client.execRequest('batch', preparedRequests)
    }
  }
}
