import {omit} from 'lodash-es'
import createError from 'http-errors'
import distance from '@turf/distance'

import {featureMatches, sortAndPickResults, computeScore} from '../../../lib/spatial-index/util.js'
import {reverse as reverseBase} from '../../../lib/spatial-index/reverse.js'
import {validateStructuredSearchParams} from '../../../lib/parcel/structured-search.js'

import {getNomCommune} from './cog.js'

const SEARCH_MAX_DISTANCE_IN_METERS = 2000
const SEARCH_MAX_ITERATIONS = 10_000

export function checkConfig({rtreeIndex, db}) {
  if (!rtreeIndex || !db) {
    throw new Error('search must be called with db and rtreeIndex params')
  }
}

export function getById(params, options) {
  if (!options.db) {
    throw new Error('db is required')
  }

  const {q, center, returntruegeometry} = params
  const {db} = options

  const feature = db.getFeatureById(q)

  if (feature) {
    return formatResult(feature, {center, returntruegeometry})
  }
}

export function asArray(result) {
  return result ? [result] : []
}

export function buildSearchPattern({departmentcode, municipalitycode, oldmunicipalitycode, districtcode, section, number}) {
  validateStructuredSearchParams({departmentcode, municipalitycode, districtcode})

  let citycode

  if (districtcode) {
    citycode = `${departmentcode}${districtcode}`
  } else if (departmentcode === '75' && municipalitycode === '056') {
    citycode = '75***'
  } else if (departmentcode === '69' && municipalitycode === '123') {
    citycode = '6938*'
  } else if (departmentcode === '13' && municipalitycode === '055') {
    citycode = '132**'
  } else {
    citycode = `${departmentcode}${municipalitycode}`
  }

  return `${citycode}${oldmunicipalitycode || '000'}${section || '**'}${number || '****'}`
}

export function structuredSearch(params, options) {
  const {filters, limit, returntruegeometry, batch} = params
  const {db} = options

  const searchPattern = buildSearchPattern(filters)

  if (!searchPattern.includes('*')) {
    return asArray(getById({q: searchPattern, returntruegeometry}, {db}))
      .filter(f => featureMatches(f, null, filters))
  }

  const start = searchPattern.slice(0, searchPattern.indexOf('*')).padEnd(14, '0')
  const end = searchPattern.slice(0, searchPattern.indexOf('*')).padEnd(14, 'Z')

  const regexp = new RegExp('^' + searchPattern.replaceAll('*', '.') + '$')

  const parcels = []

  for (const parcelId of db.idIdxDb.getKeys({start, end, snapshot: false})) {
    if (!regexp.test(parcelId)) {
      continue
    }

    const parcelFeature = db.getFeatureById(parcelId)

    if (!featureMatches(parcelFeature, null, filters)) {
      continue
    }

    // If we are in batch mode we don't want to have ambiguous results
    if (batch && parcels.length > 0) {
      return []
    }

    parcels.push(parcelFeature)

    if (parcels.length === limit) {
      break
    }
  }

  return parcels.map(parcelFeature => formatResult(parcelFeature, {returntruegeometry}))
}

export function geoSearch(params, options) {
  const {center, filters, limit, returntruegeometry} = params
  const {rtreeIndex, db} = options

  const [lon, lat] = center
  const matchingFeatures = []

  let iterations = 0

  rtreeIndex.neighbors(lon, lat, 1, Number.POSITIVE_INFINITY, idx => {
    iterations++

    const feature = db.getFeatureByIdx(idx)
    const matches = featureMatches(feature, null, filters)
    const distance = computeDistance(feature, center)

    if (matches && distance <= SEARCH_MAX_DISTANCE_IN_METERS) {
      const resultFeature = formatResult(feature, {center, returntruegeometry, distanceCache: distance})
      matchingFeatures.push(resultFeature)
    }

    // Stop iterating if we have reached limit, max distance or SEARCH_MAX_ITERATIONS
    return iterations === SEARCH_MAX_ITERATIONS
      || matchingFeatures.length === limit
      || distance > SEARCH_MAX_DISTANCE_IN_METERS
  })

  return sortAndPickResults(
    matchingFeatures,
    {limit, center}
  )
}

export function search(params, options) {
  checkConfig(options)

  if (!params.limit) {
    throw createError(400, 'limit is a required param')
  }

  if (params.q) {
    return asArray(getById(params, options))
  }

  if (params.center) {
    return geoSearch(params, options)
  }

  if (params.filters) {
    return structuredSearch(params, options)
  }

  throw createError(400, 'Parcel search requires filters or center')
}

export function reverse(params, options) {
  if (!options.db) {
    throw new Error('db is required')
  }

  return reverseBase(params, {
    ...options,
    formatResult: (feature, options) => formatResult(feature, {...options, forceDistance: true}),
    getFeatureByIdx: idx => options.db.getFeatureByIdx(idx)
  })
}

export function formatResult(feature, {center, distanceCache, returntruegeometry, forceDistance}) {
  const result = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [feature.properties.lon, feature.properties.lat]
    },
    properties: omit(feature.properties, ['lon', 'lat'])
  }

  const citycode = feature.properties.departmentcode + feature.properties.municipalitycode
  result.properties.city = getNomCommune(citycode)

  if (distanceCache) {
    result.properties.distance = distanceCache
    result.properties.score = computeScore(distanceCache)
  } else if (center) {
    const distance = computeDistance(feature, center)
    result.properties.distance = distance
    result.properties.score = computeScore(distance)
  }

  if (forceDistance && !result.properties.distance) {
    result.properties.distance = 0
  }

  if (returntruegeometry) {
    result.properties.truegeometry = feature.geometry
  }

  return result
}

function computeDistance(feature, center) {
  const {lon, lat} = feature.properties
  return Math.round(distance(center, [lon, lat]) * 1000)
}
