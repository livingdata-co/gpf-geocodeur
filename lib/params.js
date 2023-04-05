import createError from 'http-errors'

import {poiCategories} from './poi-categories.js'
import {normalizeQuery} from './util/querystring.js'

export function isFirstCharValid(string) {
  return (string.slice(0, 1).toLowerCase() !== string.slice(0, 1).toUpperCase())
    || (string.codePointAt(0) >= 48 && string.codePointAt(0) <= 57)
}

export function isDepartmentcodeValid(departmentcode) {
  if (departmentcode.length < 2 || departmentcode.length > 3 || departmentcode === '20') {
    return false
  }

  if (departmentcode.length === 3) {
    if (departmentcode >= '971' && departmentcode <= '978') {
      return true
    }

    return false
  }

  if ((departmentcode >= '01' && departmentcode <= '95' && /\d{2}/.test(departmentcode)) || departmentcode === '2A' || departmentcode === '2B') {
    return true
  }

  return false
}

export const PARAMS = {
  indexes: {
    nameInQuery: 'index',
    type: 'string',
    array: true,
    required: false,
    allowedValues: ['address', 'poi', 'parcel'],
    defaultValue: ['address']
  },

  q: {
    type: 'string',
    validate(v) {
      if (v.length < 3 || v.length > 200 || !isFirstCharValid(v)) {
        throw new Error('must contain between 3 and 200 chars and start with a number or a letter')
      }
    }
  },

  limit: {
    type: 'integer',
    defaultValue: 5,
    validate(v) {
      if (v < 1 || v > 20) {
        throw new Error('Param limit must be an integer between 1 and 20')
      }
    }
  },

  lon: {
    type: 'float',
    validate(v) {
      if (v < -180 || v > 180) {
        throw new Error('lon must be a float between -180 and 180')
      }
    }
  },

  lat: {
    type: 'float',
    validate(v) {
      if (v < -90 || v > 90) {
        throw new Error('lat must be a float between -90 and 90')
      }
    }
  },

  type: {
    type: 'string',
    allowedValues: ['housenumber', 'street', 'locality', 'municipality']
  },

  postcode: {
    type: 'string',
    validate(v) {
      if (!/^\d{5}$/.test(v)) {
        throw new Error('Param postcode must contain 5 digits')
      }
    }
  },

  citycode: {
    type: 'string',
    validate(v) {
      if (!/^(\d{5}|\d[AB]\d{3})$/.test(v)) {
        throw new Error('Param citycode is invalid')
      }
    }
  },

  city: {
    type: 'string',
    validate(v) {
      if (v.length > 50) {
        throw new Error('must contain between 1 and 50 chars')
      }
    }
  },

  category: {
    type: 'string',
    allowedValues: poiCategories,
    array: true
  },

  returntruegeometry: {
    type: 'boolean',
    defaultValue: false
  },

  departmentcode: {
    type: 'string',
    validate(v) {
      if (!isDepartmentcodeValid(v)) {
        throw new Error('Param departmentcode is invalid')
      }
    }
  },

  municipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{2,3}$/.test(v)) {
        throw new Error('Param municipalitycode is invalid')
      }
    }
  },

  oldmunicipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('Param oldmunicipalitycode is invalid')
      }
    }
  },

  districtcode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('Param districtcode is invalid')
      }
    }
  },

  section: {
    type: 'string',
    validate(v) {
      if (!/^(\d{1,2}|[A-Z]{1,2}|0?[A-Z])$/.test(v)) {
        throw new Error('Param section is invalid')
      }
    }
  },

  number: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,4}$/.test(v)) {
        throw new Error('Param number is invalid')
      }
    }
  },

  sheet: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,2}$/.test(v)) {
        throw new Error('Param sheet is invalid')
      }
    }
  }
}

export function parseValue(value, type) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return undefined
  }

  if (type === 'string') {
    return trimmedValue
  }

  if (type === 'integer') {
    if (!/^([+-]?[1-9]\d*|0)$/.test(trimmedValue)) {
      throw new TypeError('Unable to parse value as integer')
    }

    const num = Number.parseInt(trimmedValue, 10)

    if (Number.isNaN(num)) {
      throw new TypeError('Unable to parse value as integer')
    }

    if (!Number.isSafeInteger(num)) {
      throw new TypeError('Unable to parse value as integer')
    }

    return num
  }

  if (type === 'float') {
    if (!/^[+-]?(\d+(\.\d*)?)$/.test(trimmedValue)) {
      throw new TypeError('Unable to parse value as float')
    }

    const num = Number.parseFloat(trimmedValue)

    if (Number.isNaN(num)) {
      throw new TypeError('Unable to parse value as float')
    }

    return num
  }

  if (type === 'boolean') {
    const lcValue = trimmedValue.toLowerCase()

    if (['1', 'true', 'yes'].includes(lcValue)) {
      return true
    }

    if (['0', 'false', 'no'].includes(lcValue)) {
      return false
    }

    throw new Error('Unable to parse value as boolean')
  }

  throw new TypeError('Unsupported value type: ' + type)
}

export function parseArrayValues(values, type) {
  const arrayValues = values.split(',')
    .map(v => parseValue(v, type))
    .filter(Boolean)

  return arrayValues.length > 0 ? arrayValues : undefined
}

export function extractParam(query, paramName, definition) {
  const {type, array, allowedValues, required, defaultValue, nameInQuery, validate} = definition

  const rawValue = query[nameInQuery || paramName]
  let parsedValue

  // Parsing
  if (rawValue) {
    parsedValue = array
      ? parseArrayValues(rawValue, type)
      : parseValue(rawValue, type)
  }

  // Enum
  if (parsedValue && allowedValues) {
    if (array) {
      const unexpectedValue = parsedValue.find(v => !allowedValues.includes(v))
      if (unexpectedValue) {
        throw new Error(`Unexpected value '${unexpectedValue}' for param ${paramName}`)
      }
    } else if (!allowedValues.includes(parsedValue)) {
      throw new Error(`Unexpected value '${parsedValue}' for param ${paramName}`)
    }
  }

  // Validation
  if (parsedValue !== undefined && validate) {
    validate(parsedValue)
  }

  // Required
  if (parsedValue === undefined && required) {
    throw new Error(`${paramName} is a required param`)
  }

  // Default value
  if (parsedValue === undefined && defaultValue) {
    parsedValue = defaultValue
  }

  // Dedupe
  if (Array.isArray(parsedValue)) {
    parsedValue = [...new Set(parsedValue)]
  }

  return parsedValue
}

export function extractSingleParams(query) {
  const params = {}
  const errors = []

  for (const [paramName, definition] of Object.entries(PARAMS)) {
    try {
      const parsedValue = extractParam(query, paramName, definition)
      if (parsedValue !== undefined) {
        params[paramName] = parsedValue
      }
    } catch (error) {
      errors.push(error.message)
    }
  }

  if (errors.length > 0) {
    throw createError(400, 'Failed parsing query', {detail: errors})
  }

  return params
}

export function extractParams(query, {operation}) {
  const parsedParams = extractSingleParams(normalizeQuery(query))

  const hasLat = 'lat' in parsedParams
  const hasLon = 'lon' in parsedParams

  if ((hasLat && !hasLon) || (hasLon && !hasLat)) {
    throw createError(400, 'Failed parsing query', {detail: ['lon/lat must be present together if defined']})
  }

  const parcelOnly = parsedParams.indexes.length === 1 && parsedParams.indexes[0] === 'parcel'

  if (operation === 'search' && !parcelOnly && !('q' in parsedParams)) {
    throw createError(400, 'Failed parsing query', {detail: ['q is a required param']})
  }

  return parsedParams
}