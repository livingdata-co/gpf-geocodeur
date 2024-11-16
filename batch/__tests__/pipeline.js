import test from 'ava'
import createError from 'http-errors'
import {validatePipeline, validateOutputFormat} from '../pipeline.js'

test('validateOutputFormat', t => {
  t.is(validateOutputFormat(), 'csv')
  t.is(validateOutputFormat('csv'), 'csv')
  t.is(validateOutputFormat('geojson'), 'geojson')
  const error = t.throws(() => validateOutputFormat('xml'), {instanceOf: createError.HttpError})
  t.is(error.status, 400)
  t.is(error.message, 'outputFormat not supported: xml')
})

test('validatePipeline / minimal', t => {
  t.deepEqual(validatePipeline({
    geocodeOptions: {}
  }), {
    geocodeOptions: {
      indexes: ['address'],
      operation: 'search'
    },
    outputFormat: 'csv'
  })
})

test('validatePipeline / outputFormat', t => {
  t.deepEqual(validatePipeline({
    geocodeOptions: {},
    outputFormat: 'geojson'
  }), {
    geocodeOptions: {
      indexes: ['address'],
      operation: 'search'
    },
    outputFormat: 'geojson'
  })
})

test('validatePipeline / unknow outputFormat', t => {
  const error = t.throws(() => {
    validatePipeline({
      geocodeOptions: {},
      outputFormat: 'xml'
    })
  })

  t.is(error.status, 400)
  t.is(error.message, 'outputFormat not supported: xml')
})

// Test lorsqu'il manque une clé obligatoire
test('validatePipeline / missing geocodeOptions', t => {
  const invalidPipeline = {
    outputFormat: 'csv'
  }

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Missing or invalid geocodeOptions')
})
