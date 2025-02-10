export function ensureSingleValue(value) {
  return Array.isArray(value) ? value.pop() : value
}

export function isArrayOfStrings(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function normalizeQuery(query) {
  const normalizedQuery = {}

  for (const [key, value] of Object.entries(query)) {
    if (isArrayOfStrings(value)) {
      normalizedQuery[key.trim()] = value.pop().trim()
    } else if (typeof value === 'string') {
      normalizedQuery[key.trim()] = value.trim()
    }
  }

  return normalizedQuery
}
