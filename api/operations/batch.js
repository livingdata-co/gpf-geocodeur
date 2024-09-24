import {maxBy} from 'lodash-es'

export default async function batch(payload, options = {}) {
  const {indexes, signal} = options
  const results = await indexes.dispatchRequest(payload, 'batch', {signal})

  return mergeResults(results)
}

function mergeResults(indexesResults) {
  const successfulResults = []
  let errorResult

  for (const [index, indexResults] of Object.entries(indexesResults)) {
    for (const result of indexResults) {
      if (result.status === 'ok') {
        successfulResults.push({
          status: 'ok',
          result: result.result,
          index
        })
      }

      if (result.status === 'error') {
        errorResult = {
          status: 'error',
          result: result.result,
          index
        }
      }
    }
  }

  if (successfulResults.length === 0) {
    return errorResult ? [errorResult] : [{status: 'not-found', result: {}}]
  }

  const bestResult = maxBy(successfulResults, item => item.result.score)
  return [bestResult]
}
