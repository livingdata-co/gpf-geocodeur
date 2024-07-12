export default async function batch(payload, options = {}) {
  const {indexes, signal} = options
  const results = await indexes.dispatchRequest({...payload, indexes: ['address']}, 'batch', {signal})
  return mergeResults(results, payload)
}

export function mergeResults(indexesResults) {
  return indexesResults.address
}
