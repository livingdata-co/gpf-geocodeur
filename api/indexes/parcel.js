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

  return {
    q: params.q,
    center,
    filters,
    limit: Math.max(params.limit || 10, 10),
    returntruegeometry: params.returntruegeometry,
    geometry: params.searchgeom
  }
}

export default function createParcelIndex(options = {}) {
  const client = createClient({
    indexUrl: options.parcelIndexUrl || PARCEL_INDEX_URL,
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

    async batch(params) {
      return params.requests.map(r => ({id: r.id, status: 'error', error: 'Index not available'}))
    }
  }
}
