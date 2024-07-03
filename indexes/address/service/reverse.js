import distance from '@turf/distance'

import {computeScore} from '../../../lib/spatial-index/util.js'
import {reverse as reverseBase} from '../../../lib/spatial-index/reverse.js'

export function reverse(params, options) {
  if (!options.db) {
    throw new Error('db is required')
  }

  return reverseBase(params, {
    ...options,
    formatResult,
    getFeatureByIdx: idx => options.db.getCompleteFeatureByIdx(idx)
  })
}

export function formatResult(feature, {center}) {
  const result = {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {...feature.properties}
  }

  if (center) {
    const distance = computeDistance(feature, center)
    result.properties.distance = distance
    result.properties.score = computeScore(distance)
  } else {
    result.properties.distance = 0
  }

  return result
}

export function computeDistance(feature, center) {
  return Math.round(distance(center, feature) * 1000)
}
