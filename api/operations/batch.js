import {maxBy} from 'lodash-es'

export default async function batch(payload, options = {}) {
  const {indexes, signal} = options
  const results = await indexes.dispatchRequest(payload, 'batch', {signal})

  return mergeResults(results)
}

export function mergeResults(indexesResults) {
  // Extract the first index results to get the keys
  const anyIndexResults = indexesResults[Object.keys(indexesResults)[0]]

  return anyIndexResults.map((_, resultIndex) => {
    const successfulResults = []
    let errorResult

    for (const [index, indexResults] of Object.entries(indexesResults)) {
      const indexResult = indexResults[resultIndex]

      if (indexResult.status === 'ok') {
        successfulResults.push({
          status: 'ok',
          result: indexResult.result,
          index
        })
      }

      if (indexResult.status === 'error') {
        errorResult = {
          status: 'error',
          result: indexResult.result
        }
      }
    }

    if (successfulResults.length === 0) {
      return errorResult ?? {status: 'not-found', result: {}}
    }

    return maxBy(successfulResults, item => item.result.score)
  })
}
