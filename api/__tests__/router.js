/* eslint import/first: off */
import process from 'node:process'
import test from 'ava'
import request from 'supertest'
import express from 'express'
import nock from 'nock'

process.env.POI_INDEX_URL = 'http://poi-index'

import createRouter from '../router.js'

test('search / address index', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      return {
        foo: [
          {properties: {bar: 'foobar'}}
        ]
      }
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/search')
    .query({q: 'test', limit: 10})

  t.is(response.status, 200)
  t.is(response.body.type, 'FeatureCollection')
  t.deepEqual(response.body.features, [{properties: {bar: 'foobar', _type: 'foo'}}])
})

test('reverse / address index', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      return {
        foo: [
          {properties: {bar: 'reverse'}}
        ]
      }
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/reverse')
    .query({lat: 48.8566, lon: 2.3522})

  t.is(response.status, 200)
  t.is(response.body.type, 'FeatureCollection')
  t.deepEqual(response.body.features, [{properties: {bar: 'reverse', _type: 'foo'}}])
})

test('search / empty response', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      return {
        foo: []
      }
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/search')
    .query({q: 'empty', limit: 10})

  t.is(response.status, 200)
  t.is(response.body.type, 'FeatureCollection')
  t.deepEqual(response.body.features, [])
})

test('search / invalid query parameters', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      return {
        foo: [
          {bar: 'invalid'}
        ]
      }
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/search')
    .query({q: 'test', limit: -1})

  t.is(response.status, 400)
  t.is(response.body.message, 'Failed parsing query')
  t.deepEqual(response.body.detail, ['limit: must be an integer between 1 and 50'])
})

test('search / server error', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      throw new Error('Error')
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/search')
    .query({q: 'test', limit: 10})

  t.is(response.status, 500)
  t.is(response.body.message, 'An unexpected error has occurred')
})

test('completion', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      return {}
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/completion')
    .query({text: 'test'})

  t.is(response.status, 200)
  t.deepEqual(response.body, {
    status: 'OK',
    results: []
  })
})

test('completion / with error', async t => {
  const app = express()

  const customIndexes = {
    dispatchRequest() {
      throw new Error('Error in autocomplete')
    }
  }

  const router = await createRouter({customIndexes})
  app.use('/', router)

  const response = await request(app)
    .get('/completion')
    .query({text: 'test'})

  t.is(response.status, 200)
  t.deepEqual(response.body, {
    status: 'Error',
    error: 'Error in autocomplete'
  })
})

test('getCapabilities / geocodage', async t => {
  const app = express()

  nock(process.env.POI_INDEX_URL)
    .get('/categories')
    .reply(200, {
      cimetiere: [],
      construction: ['pont', 'croix']
    })

  const router = await createRouter()
  app.use('/', router)

  const response = await request(app)
    .get('/getCapabilities')

  t.is(response.status, 200)
  t.truthy(response.body.api)
  t.truthy(response.body.indexes)
  t.truthy(response.body.info)
  t.truthy(response.body.operations)
})

test('getCapabilities / autocomplete', async t => {
  const app = express()

  nock(process.env.POI_INDEX_URL)
    .get('/categories')
    .reply(200, {
      cimetiere: [],
      construction: ['pont', 'croix']
    })

  const router = await createRouter()
  app.use('/', router)

  const response = await request(app)
    .get('/completion/getCapabilities')

  t.is(response.status, 200)
  t.truthy(response.body.api)
  t.truthy(response.body.indexes)
  t.truthy(response.body.info)
  t.truthy(response.body.operations)
})

test('openAPI / geocode.yaml', async t => {
  const app = express()
  const router = await createRouter()
  app.use('/', router)

  const response = await request(app)
    .get('/openapi.yaml')

  t.is(response.status, 200)
  t.is(response.headers['content-type'], 'text/yaml; charset=utf-8')
})

test('openAPI / completion.yaml', async t => {
  const app = express()
  const router = await createRouter()
  app.use('/', router)

  const response = await request(app)
    .get('/completion/openapi.yaml')

  t.is(response.status, 200)
  t.is(response.headers['content-type'], 'text/yaml; charset=utf-8')
})
