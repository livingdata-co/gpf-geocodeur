import createError from 'http-errors'
import bbox from '@turf/bbox'
import circle from '@turf/circle'

import {bboxMaxLength, featureMatches, sortAndPickResults, extractIntersectingTiles} from './util.js'

const REVERSE_FIRST_PASS_CIRCLE_RADIUS_IN_METERS = 100
const REVERSE_SECOND_PASS_CIRCLE_RADIUS_IN_METERS = 200

export function reverse(options) {
  const {rtreeIndex, formatResult, getFeatureByIdx, enableTileIndex} = options

  if (!rtreeIndex) {
    throw new Error('rtreeIndex is required')
  }

  if (!formatResult) {
    throw new Error('formatResult is required')
  }

  if (!getFeatureByIdx) {
    throw new Error('getFeatureByIdx is required')
  }

  const {center, filters, returntruegeometry, limit} = options
  let {geometry} = options

  if (!limit) {
    throw createError(400, 'limit is a required param')
  }

  if (!geometry && !center) {
    throw createError(400, 'search must be called with at least geometry or center param')
  }

  geometry ||= circle(center, REVERSE_FIRST_PASS_CIRCLE_RADIUS_IN_METERS / 1000, {step: 16})

  if (geometry.type === 'Circle') {
    geometry = circle(geometry.coordinates, geometry.radius / 1000, {step: 16})
  }

  const geometryBbox = bbox(geometry)

  if (bboxMaxLength(geometryBbox) > 1.1) { // 1km with 10% margin
    throw createError(400, 'geometry bbox height/width must be less than 1km')
  }

  const matchingFeatures = []

  rtreeIndex.search(...geometryBbox, idx => {
    const feature = getFeatureByIdx(idx)
    const matches = featureMatches(feature, geometry, filters)

    if (matches) {
      matchingFeatures.push(formatResult(feature, {center, returntruegeometry}))
    }

    return matches
  })

  if (enableTileIndex) {
    const geometryTiles = extractIntersectingTiles(geometry)
    const candidateFeaturesFromTiles = options.db.getFeaturesByTiles(geometryTiles)

    for (const feature of candidateFeaturesFromTiles) {
      const matches = featureMatches(feature, geometry, filters)

      if (matches) {
        matchingFeatures.push(formatResult(feature, {center, returntruegeometry}))
      }
    }
  }

  // In case we built a circle geometry and nothing is found, we try again with a larger circle
  if (matchingFeatures.length === 0 && !options.geometry) {
    return reverse({
      ...options,
      geometry: circle(center, REVERSE_SECOND_PASS_CIRCLE_RADIUS_IN_METERS / 1000, {step: 16})
    })
  }

  return sortAndPickResults(
    matchingFeatures,
    {limit, center}
  )
}
