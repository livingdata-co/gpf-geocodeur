import createError from 'http-errors'

import {extractGeocodeOptions} from './options.js'

export function validateOutputFormat(outputFormat) {
  if (!outputFormat) {
    return 'csv'
  }

  if (!['csv', 'geojson'].includes(outputFormat)) {
    throw createError(400, `outputFormat not supported: ${outputFormat}`)
  }

  return outputFormat
}

export function validatePipeline(pipeline) {
  const outputFormat = validateOutputFormat(pipeline.outputFormat)

  if (!pipeline.geocodeOptions || typeof pipeline.geocodeOptions !== 'object') {
    throw createError(400, 'Missing or invalid geocodeOptions')
  }

  return {
    geocodeOptions: extractGeocodeOptions(pipeline.geocodeOptions),
    outputFormat
  }
}
