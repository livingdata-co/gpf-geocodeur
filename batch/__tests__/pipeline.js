import test from 'ava'
import createError from 'http-errors'
import {validatePipeline} from '../pipeline.js'

// Pipeline valide de base
const validPipeline = {
  format: 'csv',
  formatOptions: {},
  geocodeOptions: {},
  outputFormat: 'csv',
  outputFormatOptions: {}
}

// Test de la validation réussie d'un pipeline valide
test('validatePipeline retourne un pipeline valide sans erreur', t => {
  const result = validatePipeline(validPipeline)
  t.deepEqual(result, validPipeline, 'Le pipeline retourné doit correspondre au pipeline d\'entrée valide')
})

// Test lorsqu'il manque une clé obligatoire
test('validatePipeline lance une erreur lorsque une clé est manquante', t => {
  const invalidPipeline = {...validPipeline}
  delete invalidPipeline.format

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Missing key format in pipeline definition', 'Le message doit indiquer la clé manquante')
})

// Test lorsqu'une clé obligatoire est vide
test('validatePipeline lance une erreur lorsqu\'une clé est vide', t => {
  const invalidPipeline = {...validPipeline, format: ''}

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Missing key format in pipeline definition', 'Le message doit indiquer la clé manquante ou vide')
})

// Test d'un format non supporté
test('validatePipeline lance une erreur si le format n\'est pas csv', t => {
  const invalidPipeline = {...validPipeline, format: 'json'}

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Format not supported: json', 'Le message doit indiquer que le format n\'est pas supporté')
})

// Test d'un outputFormat non supporté
test('validatePipeline lance une erreur si outputFormat n\'est pas csv ou geojson', t => {
  const invalidPipeline = {...validPipeline, outputFormat: 'xml'}

  const error = t.throws(() => {
    validatePipeline(invalidPipeline)
  }, {instanceOf: createError.HttpError})

  t.is(error.status, 400)
  t.is(error.message, 'Output format not supported: xml', 'Le message doit indiquer que le outputFormat n\'est pas supporté')
})

// Test d'un pipeline valide avec outputFormat geojson
test('validatePipeline accepte outputFormat geojson', t => {
  const validGeojsonPipeline = {...validPipeline, outputFormat: 'geojson'}
  const result = validatePipeline(validGeojsonPipeline)

  t.deepEqual(result, validGeojsonPipeline, 'Le pipeline retourné doit correspondre au pipeline geojson valide')
})
