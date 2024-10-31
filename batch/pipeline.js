import createError from 'http-errors'
import {pick} from 'lodash-es'

const PIPELINE_KEYS = ['geocodeOptions', 'outputFormat']

export function validatePipeline(pipeline) {
  const keys = Object.keys(pipeline)
  const missingKey = PIPELINE_KEYS.find(key => !keys.includes(key) || !pipeline[key])

  if (missingKey) {
    throw createError(400, `Missing key ${missingKey} in pipeline definition`)
  }

  if (!['csv', 'geojson'].includes(pipeline.outputFormat)) {
    throw createError(400, `Output format not supported: ${pipeline.outputFormat}`)
  }

  return pick(pipeline, PIPELINE_KEYS)
}
