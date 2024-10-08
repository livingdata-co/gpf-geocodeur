import createError from 'http-errors'
import onFinished from 'on-finished'

import logger from './logger.js'

export function getOperationFunction(operationName, supportedOperations) {
  if (operationName in supportedOperations) {
    return supportedOperations[operationName]
  }

  throw createError(400, `Operation ${operationName} is not supported`)
}

export function validateBatchPayload(payload, acceptedOperations) {
  if (!payload.requests || !Array.isArray(payload.requests)) {
    throw createError(400, 'requests is a required param (array)')
  }

  if (payload.requests.length > 100) {
    throw createError(400, 'requests must not contains more than 100 items')
  }

  for (const r of payload.requests) {
    if (!acceptedOperations.has(r.operation)) {
      throw createError(400, 'operation is unknown')
    }

    if (!r.params) {
      throw createError(400, 'params is required for each requests item')
    }
  }
}

export async function executeBatch(requests, {operations, signal}) {
  validateBatchPayload({requests}, new Set(Object.keys(operations)))

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
        score_next: operationResult[1] ? operationResult[1].properties.score : undefined, // eslint-disable-line camelcase
        lon: operationResult[0].geometry.coordinates[0],
        lat: operationResult[0].geometry.coordinates[1]
      }

      result.score ||= 1 // Ensure a score is always present

      return {
        id,
        status: 'ok',
        result
      }
    } catch (error) {
      if (error.statusCode !== 400 && error.message !== 'Aborted') {
        logger.error(error)
      }

      return {
        id,
        status: 'error',
        error: error.statusCode === 400 ? error.message : 'Unexpected error'
      }
    }
  }))
}

export function batch({operations}) {
  return async (req, res) => {
    const ac = new AbortController()
    onFinished(res, async () => ac.abort()) // Abort the batch request if the client disconnects

    const {requests} = req.body

    const results = await executeBatch(requests, {operations, signal: ac.signal})

    res.send({results})
  }
}
