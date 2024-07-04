export default async function batch(params, options = {}) {
  const {indexes} = options
  const results = await indexes.dispatchRequest({...params, indexes: ['address']}, 'batch')
  return mergeResults(results, params)
}

export function mergeResults(indexesResults) {
  return indexesResults.address
}
