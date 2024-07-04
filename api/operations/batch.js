export default async function batch(payload, options = {}) {
  const {indexes} = options
  const results = await indexes.dispatchRequest({...payload, indexes: ['address']}, 'batch')
  return mergeResults(results, payload)
}

export function mergeResults(indexesResults) {
  return indexesResults.address
}
