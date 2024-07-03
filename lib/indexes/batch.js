import createError from 'http-errors'

import logger from '../logger.js'

export function getOperationFunction(operationName, supportedOperations) {
  if (operationName in supportedOperations) {
    return supportedOperations[operationName]
  }

  throw createError(400, `Operation ${operationName} is not supported`)
}

export async function executeBatch(requests, {operations, signal}) {
  if (!Array.isArray(requests)) {
    throw createError(400, 'requests is a required param (array)')
  }

  if (requests.length > 100) {
    throw createError(400, 'requests must not contains more than 100 items')
  }

  for (const r of requests) {
    if (!(r.operation in operations)) {
      throw createError(400, 'operation is unknown')
    }

    if (!r.params) {
      throw createError(400, 'params is required for each requests item')
    }
  }

  return Promise.all(requests.map(async r => {
    const {operation, params, id} = r

    const operationFunction = getOperationFunction(operation, operations)

    try {
      const operationResult = await operationFunction(params, {signal})

      if (operationResult.length === 0) {
        return {
          id,
          status: 'not-found'
        }
      }

      const result = {
        ...operationResult[0].properties,
        nextResultScore: operationResult[1] ? operationResult[1].properties.score : undefined,
        lon: operationResult[0].geometry.coordinates[0],
        lat: operationResult[0].geometry.coordinates[1]
      }

      return {
        id,
        status: 'ok',
        result
      }
    } catch (error) {
      logger.error(error)
      return {
        id,
        status: 'error',
        error: error.message
      }
    }
  }))
}

export function batch({operations}) {
  return async (req, res) => {
    const ac = new AbortController()
    req.on('close', () => ac.abort())

    const {requests} = req.body

    const results = await executeBatch(requests, {operations, signal: ac.signal})

    res.send({results})
  }
}
