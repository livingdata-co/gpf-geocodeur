import test from 'ava'
import createError from 'http-errors'
import {validatePipeline} from '../pipeline.js'

// Pipeline valide de base
const validPipeline = {
  geocodeOptions: {},
  outputFormat: 'csv'
}

// Test de la validation réussie d'un pipeline valide
test('validatePipeline retourne un pipeline valide sans erreur', t => {
  const result = validatePipeline(validPipeline)
  t.deepEqual(result, validPipeline, 'Le pipeline retourné doit correspondre au pipeline d\'entrée valide')
})

// Test lorsqu'il manque une clé obligatoire
test('validatePipeline lance une erreur lorsque une clé est manquante', t => {
  const invalidPipeline = {
    outputFormat: 'csv'
  }

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Missing key geocodeOptions in pipeline definition')
})

// Test d'un outputFormat non supporté
test('validatePipeline lance une erreur si outputFormat n\'est pas csv ou geojson', t => {
  const invalidPipeline = {...validPipeline, outputFormat: 'xml'}

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Output format not supported: xml')
})

// Test d'un pipeline valide avec outputFormat geojson
test('validatePipeline accepte outputFormat geojson', t => {
  const validGeojsonPipeline = {...validPipeline, outputFormat: 'geojson'}
  const result = validatePipeline(validGeojsonPipeline)

  t.deepEqual(result, validGeojsonPipeline)
})
