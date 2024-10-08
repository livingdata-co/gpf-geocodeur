import process from 'node:process'
import {pick} from 'lodash-es'

import {createClient} from '../../lib/indexes/client.js'

const {PARCEL_INDEX_URL} = process.env

const FILTERS = [
  'departmentcode',
  'municipalitycode',
  'oldmunicipalitycode',
  'districtcode',
  'section',
  'sheet',
  'number'
]

export function prepareRequest(params) {
  const filters = pick(params, FILTERS)
  const center = params.lon !== undefined && params.lat !== undefined
    ? [params.lon, params.lat]
    : undefined

  const request = {
    center,
    filters,
    limit: Math.max(params.limit || 10, 10),
    returntruegeometry: params.returntruegeometry,
    geometry: params.searchgeom
  }

  // Send q param only if no filters are provided
  if (Object.keys(request.filters).length === 0) {
    request.q = params.q
  }

  return request
}

export default function createParcelIndex(options = {}) {
  const client = createClient({
    indexUrl: options.parcelIndexUrl || PARCEL_INDEX_URL
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
