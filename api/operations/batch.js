import {maxBy} from 'lodash-es'

export default async function batch(payload, options = {}) {
  const {indexes, signal} = options
  const results = await indexes.dispatchRequest(payload, 'batch', {signal})

  return mergeResults(results)
}

const mergeResults = indexesResults => {
  const results = []

  const keys = Object.keys(indexesResults)

  for (let i = 0; i < indexesResults[keys[0]].length; i++) {
    const items = keys.map(key => indexesResults[key][i])
    const validResults = items.filter(item => item.status === 'ok')
    const bestResult = maxBy(validResults, item => item.result.score)

    if (bestResult) {
      results.push({
        status: bestResult.status,
        result: bestResult.result,
        index: keys.find(key => indexesResults[key][i] === bestResult)
      })
    } else {
      results.push({
        status: 'not-found',
        result: {},
        index: keys.find(key => indexesResults[key][i].status === 'not-found')
      })
    }
  }

  return results
}
