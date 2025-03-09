import createError from 'http-errors'
import {hint} from '@mapbox/geojsonhint'
import computeBbox from '@turf/bbox'

import {validateStructuredSearchParams} from '../../lib/parcel/structured-search.js'
import {bboxMaxLength} from '../../lib/spatial-index/util.js'
import {validateCircle} from '../../lib/geometries.js'

import {extractSingleParams, isFirstCharValid, isDepartmentcodeValid} from '../util/params.js'
import {normalizeQuery} from '../util/querystring.js'
import {searchCity} from '../util/search-city.js'

const SEARCHGEOM_BBOX_MAX_LENGTH = 1000

export function validateSearchgeom(searchgeom) {
  if (!Object.hasOwn(searchgeom, 'type')) {
    throw createError(400, 'geometry object must have a \'type\' property')
  }

  const allowedGeometryTypes = new Set([
    'Point',
    'LineString',
    'Polygon',
    'Circle'
  ])

  if (!allowedGeometryTypes.has(searchgeom.type)) {
    throw createError(400, `geometry type (${searchgeom.type}) not allowed`)
  }

  if (searchgeom.type === 'Circle') {
    return validateCircle(searchgeom, SEARCHGEOM_BBOX_MAX_LENGTH / 2)
  }

  const errors = hint(searchgeom)

  if (errors.length > 0) {
    throw createError(400, `geometry not valid: ${errors[0].message}`)
  }

  const bbox = computeBbox(searchgeom)
  if (bboxMaxLength(bbox) > SEARCHGEOM_BBOX_MAX_LENGTH / 1000) {
    throw createError(400, `geometry is too big: bbox max length must be less than ${SEARCHGEOM_BBOX_MAX_LENGTH}m`)
  }
}

export const PARAMS = {
  indexes: {
    nameInQuery: 'index',
    type: 'string',
    array: true,
    required: false,
    allowedValues: ['address', 'poi', 'parcel'],
    defaultValue: ['address'],
    description: 'index de recherche',
    example: 'address,parcel,poi'
  },

  searchgeom: {
    type: 'object',
    validate(v) {
      validateSearchgeom(v)
    },
    operation: 'reverse',
    description: 'géométrie de recherche par intersection spatiale. Les géométries autorisées sont : Point, LineString, Polygon et Circle. LineString et Point sont inopérants pour l’index address.',
    example: '{"type":"Polygon","coordinates":[[[2.354550,48.837961],[2.354550,48.839232],[2.357211,48.839232],[2.357211,48.837961],[2.354550,48.837961]]]}'
  },

  q: {
    type: 'string',
    validate(v) {
      if (v.length < 3 || v.length > 200 || !isFirstCharValid(v)) {
        throw new Error('must contain between 3 and 200 chars and start with a number or a letter')
      }
    },
    operation: 'search',
    description: 'chaîne décrivant la localisation à rechercher',
    example: '73 Avenue de Paris Saint-Mandé'
  },

  limit: {
    type: 'integer',
    defaultValue: 10,
    validate(v) {
      if (v < 1 || v > 50) {
        throw new Error('must be an integer between 1 and 50')
      }
    },
    description: 'nombre maximum de candidats retournés',
    example: '5'
  },

  lon: {
    type: 'float',
    validate(v) {
      if (v < -180 || v > 180) {
        throw new Error('must be a float between -180 and 180')
      }
    },
    description: 'longitude d’un localisant pour favoriser les candidats les plus proches',
    example: '2.327640'
  },

  lat: {
    type: 'float',
    validate(v) {
      if (v < -90 || v > 90) {
        throw new Error('must be a float between -90 and 90')
      }
    },
    description: 'latitude d’un localisant pour favoriser les candidats les plus proches',
    example: '48.835187'
  },

  type: {
    type: 'string',
    allowedValues: ['housenumber', 'street', 'locality', 'municipality'],
    description: 'filtre pour l’index address. Il permet de filtrer par type de données adresse : numéro de maison, rue, commune, ...',
    example: 'municipality'
  },

  postcode: {
    type: 'string',
    validate(v) {
      if (!/^\d{5}$/.test(v)) {
        throw new Error('must contain 5 digits')
      }
    },
    description: 'filtre pour les index address et poi. Il permet de filtrer les résultats par code postal',
    example: '94160'
  },

  citycode: {
    type: 'string',
    validate(v) {
      if (!/^(\d{5}|\d[AB]\d{3})$/.test(v)) {
        throw new Error('not valid')
      }
    },
    description: 'filtre pour les index address et poi. Il permet de filtrer les résultats par code INSEE',
    example: '94067'
  },

  city: {
    type: 'string',
    validate(v) {
      if (v.length > 50) {
        throw new Error('must contain between 1 and 50 chars')
      }
    },
    description: 'filtre pour les index address et poi. Il permet de filtrer par nom de commune',
    example: 'saint-mandé'
  },

  category: {
    type: 'string',
    description: 'filtre pour l’index poi. Il permet de filtrer par catégorie de poi',
    example: 'administratif'
  },

  returntruegeometry: {
    type: 'boolean',
    defaultValue: false,
    description: 'indique si la vraie géométrie doit être retournée',
    example: 'false'
  },

  autocomplete: {
    type: 'boolean',
    defaultValue: true,
    description: 'indique si la recherche doit être réalisée en mode auto-complétion. Pertinent uniquement pour la saisie en direct d\'utilisateurs',
    example: 'false'
  },

  departmentcode: {
    type: 'string',
    validate(v) {
      if (!isDepartmentcodeValid(v)) {
        throw new Error('not valid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code de département',
    example: '94'
  },

  municipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{2,3}$/.test(v)) {
        throw new Error('not valid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code de commune',
    example: '000'
  },

  oldmunicipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('not valid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code d’ancienne commune',
    example: '000'
  },

  districtcode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('not valid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code d’arrondissement',
    example: '105'
  },

  section: {
    type: 'string',
    validate(v) {
      if (!/^(\d{1,2}|[A-Z]{1,2}|0?[A-Z])$/.test(v)) {
        throw new Error('not valid')
      }
    },
    normalize(v) {
      return v.padStart(2, '0')
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par section',
    example: 'AC'
  },

  number: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,4}$/.test(v)) {
        throw new Error('not valid')
      }
    },
    normalize(v) {
      return v.padStart(4, '0')
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par feuille',
    example: '0035'
  },

  sheet: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,2}$/.test(v)) {
        throw new Error('not valid')
      }
    },
    normalize(v) {
      return v.padStart(2, '0')
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par feuille',
    example: '1'
  }
}

export function hasStructuredSearchParams(params) {
  return Boolean(
    params.departmentcode
    || params.municipalitycode
    || params.oldmunicipalitycode
    || params.districtcode
    || params.section
    || params.sheet
    || params.number
  )
}

export function validateLonLat(params) {
  const hasLat = 'lat' in params
  const hasLon = 'lon' in params

  if ((hasLat && !hasLon) || (hasLon && !hasLat)) {
    throw createError(400, 'Failed parsing query', {detail: ['lon/lat must be present together if defined']})
  }
}

export function extractSearchParams(query) {
  const parsedParams = extractSingleParams(normalizeQuery(query), PARAMS)

  validateLonLat(parsedParams)

  const parcelOnly = parsedParams.indexes.length === 1 && parsedParams.indexes[0] === 'parcel'

  if (parcelOnly && !('q' in parsedParams)) {
    validateStructuredSearchParams(parsedParams)
    return parsedParams
  }

  if ('q' in parsedParams && hasStructuredSearchParams(parsedParams)) {
    throw createError(400, 'Failed parsing query', {detail: ['q param and structured search cannot be used together']})
  }

  if (!('q' in parsedParams)) {
    throw createError(400, 'Failed parsing query', {detail: ['q: required param']})
  }

  if ('city' in parsedParams && parsedParams.indexes.includes('parcel')) {
    throw createError(400, 'Failed parsing query', {
      detail: ['city cannot be used with parcel index']
    })
  }

  if ('city' in parsedParams && 'citycode' in parsedParams) {
    throw createError(400, 'Failed parsing query', {detail: ['city and citycode params cannot be used together']})
  }

  if ('city' in parsedParams) {
    const matchingCities = searchCity(parsedParams.city)

    if (matchingCities.length === 0) {
      throw createError(400, 'Failed parsing query', {detail: [
        'city: No matching cities found'
      ]})
    }

    if (matchingCities.length === 1) {
      parsedParams.citycode = matchingCities[0].code
    } else {
      parsedParams.matchingCities = matchingCities
      parsedParams.q = `${parsedParams.q} ${parsedParams.city}`
    }
  }

  if (parsedParams.returntruegeometry) {
    parsedParams.limit = Math.min(parsedParams.limit, 20)
  }

  return parsedParams
}

export function extractReverseParams(query) {
  const parsedParams = extractSingleParams(normalizeQuery(query), PARAMS)

  validateLonLat(parsedParams)

  if (parsedParams.indexes.includes('address') && 'searchgeom' in parsedParams && !['Polygon', 'Circle'].includes(parsedParams.searchgeom.type)) {
    throw createError(400, 'Failed parsing query', {detail: [`Geometry type '${parsedParams.searchgeom.type}' not allowed for address index`]})
  }

  const hasLon = 'lon' in parsedParams
  const hasSearchGeom = 'searchgeom' in parsedParams

  if (!hasLon && !hasSearchGeom) {
    throw createError(400, 'Failed parsing query', {detail: ['At least lon/lat or searchgeom must be defined']})
  }

  if ('city' in parsedParams && parsedParams.indexes.includes('parcel')) {
    throw createError(400, 'Failed parsing query', {
      detail: ['city cannot be used with parcel index']
    })
  }

  if ('city' in parsedParams && 'citycode' in parsedParams) {
    throw createError(400, 'Failed parsing query', {detail: ['city and citycode params cannot be used together']})
  }

  if ('city' in parsedParams) {
    const matchingCities = searchCity(parsedParams.city)

    if (matchingCities.length === 0) {
      throw createError(400, 'Failed parsing query', {detail: [
        'city: No matching cities found'
      ]})
    }

    parsedParams.citycode = matchingCities.map(c => c.code)
  }

  if (parsedParams.returntruegeometry) {
    parsedParams.limit = Math.min(parsedParams.limit, 20)
  }

  return parsedParams
}
