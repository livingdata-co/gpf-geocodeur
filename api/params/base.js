import createError from 'http-errors'
import {hint} from '@mapbox/geojsonhint'

import {extractSingleParams, isFirstCharValid, isDepartmentcodeValid} from '../util/params.js'
import {normalizeQuery} from '../util/querystring.js'
import {validateCoordinatesValue} from '../util/coordinates.js'
import {searchCity} from '../util/search-city.js'

export function validateSearchgeom(searchgeom) {
  if (!Object.hasOwn(searchgeom, 'type')) {
    throw new Error('Geometry object must have a \'type\' property')
  }

  const allowedGeometryTypes = new Set([
    'Point',
    'LineString',
    'Polygon',
    'Circle'
  ])

  if (!allowedGeometryTypes.has(searchgeom.type)) {
    throw new Error(`Geometry type not allowed: ${searchgeom.type}`)
  }

  if (searchgeom.type === 'Circle') {
    if (!('radius' in searchgeom)) {
      throw new Error('Geometry not valid: radius property is missing')
    }

    const {radius} = searchgeom

    if (typeof radius !== 'number' || Number.isNaN(radius) || radius <= 0 || radius > 1000) {
      throw new TypeError('Geometry not valid: circle radius must be a float between 0 and 1000')
    }

    try {
      validateCoordinatesValue(searchgeom.coordinates)
    } catch (error) {
      throw new Error(`Geometry not valid: ${error.message}`)
    }
  } else {
    const errors = hint(searchgeom)

    if (errors.length > 0) {
      throw new Error(`Geometry not valid: ${errors[0].message}`)
    }
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
    description: 'géométrie de recherche',
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
    defaultValue: 5,
    validate(v) {
      if (v < 1 || v > 20) {
        throw new Error('Param limit must be an integer between 1 and 20')
      }
    },
    description: 'nombre maximum de candidats retournés',
    example: '5'
  },

  lon: {
    type: 'float',
    validate(v) {
      if (v < -180 || v > 180) {
        throw new Error('lon must be a float between -180 and 180')
      }
    },
    description: 'longitude d’un localisant pour favoriser les candidats les plus proches',
    example: '2.327640'
  },

  lat: {
    type: 'float',
    validate(v) {
      if (v < -90 || v > 90) {
        throw new Error('lat must be a float between -90 and 90')
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
        throw new Error('Param postcode must contain 5 digits')
      }
    },
    description: 'filtre pour les index address et poi. Il permet de filtrer les résultats par code postal',
    example: '94160'
  },

  citycode: {
    type: 'string',
    validate(v) {
      if (!/^(\d{5}|\d[AB]\d{3})$/.test(v)) {
        throw new Error('Param citycode is invalid')
      }
    },
    description: 'filtre pour les index address et poi. Il permet de filtrer les résultats par code INSSE',
    example: '94067'
  },

  city: {
    type: 'string',
    validate(v) {
      if (v.length > 50) {
        throw new Error('must contain between 1 and 50 chars')
      }
    },
    description: 'filtre pour les index address et parcel. Il permet de filtrer par nom de commune',
    example: 'saint-mandé'
  },

  category: {
    type: 'string',
    array: true,
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
        throw new Error('Param departmentcode is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code de département',
    example: '94'
  },

  municipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{2,3}$/.test(v)) {
        throw new Error('Param municipalitycode is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code de commune',
    example: '000'
  },

  oldmunicipalitycode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('Param oldmunicipalitycode is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code d’andienne commune',
    example: '000'
  },

  districtcode: {
    type: 'string',
    validate(v) {
      if (!/^\d{3}$/.test(v)) {
        throw new Error('Param districtcode is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par code d’arrondissement',
    example: '105'
  },

  section: {
    type: 'string',
    validate(v) {
      if (!/^(\d{1,2}|[A-Z]{1,2}|0?[A-Z])$/.test(v)) {
        throw new Error('Param section is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par section',
    example: 'AC'
  },

  number: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,4}$/.test(v)) {
        throw new Error('Param number is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par feuille',
    example: '0035'
  },

  sheet: {
    type: 'string',
    validate(v) {
      if (!/^\d{1,2}$/.test(v)) {
        throw new Error('Param sheet is invalid')
      }
    },
    description: 'filtre pour l’index parcel. Il permet de filtrer par feuille',
    example: '1'
  }
}

export function extractParams(query, {operation}) {
  const parsedParams = extractSingleParams(normalizeQuery(query), PARAMS)

  const hasLat = 'lat' in parsedParams
  const hasLon = 'lon' in parsedParams
  const hasSearchGeom = 'searchgeom' in parsedParams

  if ((hasLat && !hasLon) || (hasLon && !hasLat)) {
    throw createError(400, 'Failed parsing query', {detail: ['lon/lat must be present together if defined']})
  }

  const parcelOnly = parsedParams.indexes.length === 1 && parsedParams.indexes[0] === 'parcel'

  if (operation === 'search' && !parcelOnly && !('q' in parsedParams)) {
    throw createError(400, 'Failed parsing query', {detail: ['q is a required param']})
  }

  if (operation === 'reverse' && parsedParams.indexes.includes('address') && 'searchgeom' in parsedParams && !['Polygon', 'Circle'].includes(parsedParams.searchgeom.type)) {
    throw createError(400, 'Failed parsing query', {detail: [`Geometry type '${parsedParams.searchgeom.type}' not allowed for address index`]})
  }

  if (operation === 'reverse' && (!hasLon && !hasSearchGeom)) {
    throw createError(400, 'Failed parsing query', {detail: ['At least lon/lat or searchgeom must be defined']})
  }

  if ('city' in parsedParams) {
    const foundCitycode = searchCity(parsedParams.city)

    if (!foundCitycode) {
      throw createError(400, 'Failed to parse query', {detail: [
        'city not found'
      ]})
    }

    if ('citycode' in parsedParams && foundCitycode !== parsedParams.citycode) {
      throw createError(400, 'Failed to parse query', {detail: [
        'city and citycode are not consistent'
      ]})
    }

    parsedParams.citycode = foundCitycode
  }

  return parsedParams
}

export function groupParamsByOperation() {
  const searchParameters = []
  const reverseParameters = []

  for (const k of Object.keys(PARAMS)) {
    const {nameInQuery, description, required, type, example, allowedValues} = PARAMS[k]

    const capabilitiesParams = {
      name: nameInQuery || k,
      in: 'query',
      description,
      required: required || false,
      default: PARAMS[k].default,
      schema: {
        type: type === 'float' ? 'number' : type,
        example,
        enum: nameInQuery === 'index' ? allowedValues : undefined
      }
    }

    const {operation} = PARAMS[k]

    if (!operation || operation === 'search') {
      searchParameters.push(capabilitiesParams)
    }

    if (!operation || operation !== 'search') {
      reverseParameters.push(capabilitiesParams)
    }
  }

  return {
    searchParameters,
    reverseParameters
  }
}
