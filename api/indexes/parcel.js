import process from 'node:process'
import {pick} from 'lodash-es'

import {createClient} from '../../lib/indexes/client.js'

const {PARCEL_INDEX_URL} = process.env

const FILTERS_WITH_PADDING = {
  departmentcode: 2,
  municipalitycode: 3,
  oldmunicipalitycode: 3,
  districtcode: 3,
  section: 2,
  sheet: 2,
  number: 4
}

const FILTERS = Object.keys(FILTERS_WITH_PADDING)

export function prepareRequest(params) {
  const filters = pick(params, FILTERS)

  for (const [filter, padding] of Object.entries(FILTERS_WITH_PADDING)) {
    if (filters[filter] !== undefined) {
      filters[filter] = filters[filter].padStart(padding, '0')
    }
  }

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
