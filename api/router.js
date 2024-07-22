import process from 'node:process'
import path from 'node:path'
import {mkdir} from 'node:fs/promises'
import express from 'express'
import multer from 'multer'

import w from '../lib/w.js'
import errorHandler from '../lib/error-handler.js'
import {validateBatchPayload} from '../lib/batch.js'

import {createIndexes} from './indexes/index.js'
import search from './operations/search.js'
import reverse from './operations/reverse.js'
import batch from './operations/batch.js'
import autocomplete from './operations/autocomplete.js'
import {extractSearchParams, extractReverseParams} from './params/base.js'
import {extractParams as extractAutocompleteParams} from './params/autocomplete.js'
import computeGeocodeCapabilities from './capabilities/geocode.js'
import computeAutocompleteCapabilities from './capabilities/autocomplete.js'
import {editConfig} from './open-api/edit-config.js'
import {computeHtmlPage} from './open-api/swagger-ui.js'

import {csv, parseAndValidate} from './csv/index.js'

const GEOCODE_INDEXES = process.env.GEOCODE_INDEXES
  ? process.env.GEOCODE_INDEXES.split(',')
  : ['address', 'poi', 'parcel']

const DEFAULT_UPLOAD_DIR = 'uploads/'

const {API_ROOT_REDIRECTION} = process.env

export default async function createRouter(options = {}) {
  const uploadDir = options.uploadDir || DEFAULT_UPLOAD_DIR
  await mkdir(uploadDir, {recursive: true})

  const router = new express.Router()
  const upload = multer({dest: uploadDir, limits: {fileSize: 50 * 1024 * 1024}}) // 50MB

  const indexes = options.customIndexes || createIndexes(options.indexes || GEOCODE_INDEXES)

  router.get('/search', w(async (req, res) => {
    const params = extractSearchParams(req.query)
    const results = await search(params, {indexes})
    res.send({
      type: 'FeatureCollection',
      features: results
    })
  }))

  router.get('/reverse', w(async (req, res) => {
    const params = extractReverseParams(req.query)
    const results = await reverse(params, {indexes})
    res.send({
      type: 'FeatureCollection',
      features: results
    })
  }))

  router.post('/batch', express.json(), w(async (req, res) => {
    const payload = req.body

    validateBatchPayload(payload, new Set(['search', 'reverse']))

    const results = await batch(payload, {indexes})
    res.send({results})
  }))

  router.post(
    '/search/csv',
    upload.single('data'),
    w(parseAndValidate()),
    w(csv({indexes, operation: 'search'}))
  )

  router.post(
    '/reverse/csv',
    upload.single('data'),
    w(parseAndValidate()),
    w(csv({indexes, operation: 'reverse'}))
  )

  router.get('/completion', w(async (req, res) => {
    const params = extractAutocompleteParams(req.query)
    try {
      const results = await autocomplete(params, {indexes})
      res.send({
        status: 'OK',
        results
      })
    } catch (error) {
      res.send({
        status: 'Error',
        error: error.message
      })
    }
  }))

  router.get('/getCapabilities', w(async (req, res) => {
    const capabilities = await computeGeocodeCapabilities()
    res.send(capabilities)
  }))

  router.get('/completion/getCapabilities', w(async (req, res) => {
    const capabilities = await computeAutocompleteCapabilities()
    res.send(capabilities)
  }))

  router.get('/openapi.yaml', w(async (req, res) => {
    const yamlPath = path.resolve('./config/open-api/geocode.yaml')
    const editedConfig = await editConfig(yamlPath, process.env.API_URL)

    res
      .set('Content-Type', 'text/yaml')
      .attachment('geocode.yaml')
      .send(editedConfig)
  }))

  router.get('/openapi', (req, res) => {
    const page = computeHtmlPage({pageTitle: 'API de géocodage', openApiDefinitionUrl: 'openapi.yaml'})
    res.type('html').send(page)
  })

  router.get('/completion/openapi.yaml', w(async (req, res) => {
    const yamlPath = path.resolve('./config/open-api/completion.yaml')
    const editedConfig = await editConfig(yamlPath, process.env.API_URL)

    res
      .set('Content-Type', 'text/yaml')
      .attachment('completion.yaml')
      .send(editedConfig)
  }))

  router.get('/completion/openapi', (req, res) => {
    const page = computeHtmlPage({pageTitle: 'API de d’auto-complétion', openApiDefinitionUrl: 'openapi.yaml'})
    res.type('html').send(page)
  })

  router.get('/', (req, res) => {
    if (API_ROOT_REDIRECTION) {
      return res.redirect(API_ROOT_REDIRECTION)
    }

    res.sendStatus(404)
  })

  router.use(errorHandler)

  return router
}
