/* eslint-disable complexity */
import 'dotenv/config.js'

import test from 'ava'
import process from 'node:process'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import got from 'got'
import yaml, {JSON_SCHEMA} from 'js-yaml'

const {RECETTE_API_URL} = process.env

if (!RECETTE_API_URL) {
  throw new Error('RECETTE_API_URL is required to run this script')
}

const requestsFilePath = path.resolve('./tests/recette/definition.yaml')
const requests = yaml.load(await readFile(requestsFilePath), {schema: JSON_SCHEMA})

function prepareResult(rawResult, route) {
  if (route === '/search' || route === '/reverse') {
    const {properties} = rawResult

    const result = {
      ...properties,
      id: properties?.extrafields?.cleabs || properties.id
    }

    if (properties.city) {
      result.city = Array.isArray(properties.city) ? properties.city[0] : properties.city
    }

    if (properties.citycode) {
      result.citycode = Array.isArray(properties.citycode) ? properties.citycode[0] : properties.citycode
    }

    if (properties.postcode) {
      result.postcode = Array.isArray(properties.postcode) ? properties.postcode[0] : properties.postcode
    }

    return result
  }

  return rawResult
}

for (const [route, routeRequests] of Object.entries(requests)) {
  for (const r of routeRequests) {
    const testFn = r.status === 'fail' ? test.skip : test
    testFn(`Test: ${route}${r.request}`, async t => {
      const url = RECETTE_API_URL + route + r.request

      if (r.results?.error?.code === 400) {
        return t.throwsAsync(() => got.get(url).json(), {message: 'Response code 400 (Bad Request)'})
      }

      const responses = await got.get(url).json()

      t.truthy(responses)

      const results = responses.error ? `Error: ${responses.error}` : (
        route === '/'
          ? [prepareResult(responses, route)]
          : responses[route === '/search' || route === '/reverse' ? 'features' : 'results'].map(item =>
            prepareResult(item, route)
          )
      )

      t.truthy(results)

      if (r.results.firstResult) {
        if (route === '/search' || route === '/reverse') {
          t.true(results[0]?.id === r.results.firstResult.id)
        } else if (route === '/completion') {
          t.true(results[0]?.fulltext === r.results.firstResult.fulltext)
        }
      }

      if (r.results.only) {
        const filters = Object.keys(r.results.only)

        for (const result of results) {
          for (const filter of filters) {
            if (Array.isArray(r.results.only[filter])) {
              t.deepEqual(result[filter], r.results.only[filter])
            } else {
              t.is(result[filter], r.results.only[filter])
            }
          }
        }
      }

      if (r.results.hasProperties) {
        const filters = r.results.hasProperties

        for (const result of results) {
          for (const filter of filters) {
            t.true(Object.keys(result).includes(filter))
          }
        }
      }

      if (r.results.many) {
        const filters = Object.keys(r.results.many)

        for (const result of results) {
          for (const filter of filters) {
            if (filter === 'terr') {
              const codeDepartement = result.zipcode && (result.zipcode < '97' ? result.zipcode.slice(0, 2) : result.zipcode.slice(0, 3))

              if (codeDepartement) {
                t.true(r.results.many[filter].includes(codeDepartement))
              }
            } else {
              t.true(r.results.many[filter].includes(result[filter]))
            }
          }
        }
      }

      if (r.results.including) {
        const filters = Object.keys(r.results.including)

        for (const result of results) {
          for (const filter of filters) {
            t.true(result[filter].includes(r.results.including[filter]))
          }
        }
      }

      if (r.results.nbResult) {
        t.is(results.length, r.results.nbResult)
      }
    })
  }
}
