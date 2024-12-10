import {extractSingleParams, isFirstCharValid, parseFloatAndValidate} from '../util/params.js'
import {normalizeQuery} from '../util/querystring.js'
import {getDepartements} from '../../lib/cog.js'

const codesDepartements = new Set(getDepartements().map(d => d.code))

export function isTerrValid(terr) {
  if (terr === 'METROPOLE' || terr === 'DOMTOM') {
    return true
  }

  if (codesDepartements.has(terr)) {
    return true
  }

  if (/^\d{5}$/.test(terr)) {
    return true
  }

  return false
}

export function validateLonlat(lonlat) {
  const [lon, lat] = lonlat

  if (lon < -180 || lon > 180) {
    throw new Error('lon: must be a float between -180 and 180')
  }

  if (lat < -90 || lat > 90) {
    throw new Error('lat: must be a float between -90 and 90')
  }
}

export function validateBbox(bbox) {
  const [xmin, ymin, xmax, ymax] = bbox

  if (xmin < -180 || xmin > 180) {
    throw new Error('xmin: must be a float between -180 and 180')
  }

  if (ymin < -90 || ymin > 90) {
    throw new Error('ymin: must be a float between -90 and 90')
  }

  if (xmax < -180 || xmax > 180) {
    throw new Error('xmax: must be a float between -180 and 180')
  }

  if (ymax < -90 || ymax > 90) {
    throw new Error('ymax: must be a float between -90 and 90')
  }
}

export const AUTOCOMPLETE = {
  text: {
    type: 'string',
    required: true,
    validate(v) {
      if (v.length < 3 || v.length > 200 || !isFirstCharValid(v)) {
        throw new Error('must contain between 3 and 200 chars and start with a number or a letter')
      }
    },
    description: 'le texte devant être completé',
    example: '10 ru'
  },

  terr: {
    type: 'string',
    array: true,
    validate(v) {
      if (v.some(value => !isTerrValid(value))) {
        throw new Error('unexpected value')
      }
    },
    description: 'une limitation de la zone de recherche de localisants. Les valeurs acceptés sont METROPOLE, DOMTOM, les codes département et les codes communes (INSEE).',
    example: '75013'
  },

  poiType: {
    type: 'string',
    description: 'filtre sur le localisant pour le type de POI',
    example: 'administratif'
  },

  lonlat: {
    type: 'custom',
    extract(v) {
      const coordinates = v.split(',')

      if (coordinates.length !== 2) {
        throw new Error('must be in the format "lon,lat"')
      }

      const lon = parseFloatAndValidate(coordinates[0])
      const lat = parseFloatAndValidate(coordinates[1])

      return [lon, lat]
    },
    validate(v) {
      validateLonlat(v)
    },
    description: 'coordonnées (longitude, latitude) d\'un localisant pour favoriser les candidats les plus proches',
    example: '2.347640,48.835187'
  },

  type: {
    type: 'string',
    array: true,
    allowedValues: ['PositionOfInterest', 'StreetAddress', 'Cadastre'],
    defaultValue: ['PositionOfInterest', 'StreetAddress', 'Cadastre'],
    description: 'le type de localisant recherché, il est possible de spécifier plusieurs types séparés par une virgule',
    example: 'PositionOfInterest'
  },

  maximumResponses: {
    type: 'integer',
    defaultValue: 10,
    validate(v) {
      if (v < 1 || v > 15) {
        throw new Error('must be an integer between 1 and 15')
      }
    },
    description: 'le nombre maximum de réponses que l\'on souhaite voir retournées',
    example: '6'
  },

  bbox: {
    type: 'custom',
    extract(v) {
      const coordinates = v.split(',')

      if (coordinates.length !== 4) {
        throw new Error('must be in the format "xmin,ymin,xmax,ymax"')
      }

      const xmin = parseFloatAndValidate(coordinates[0])
      const ymin = parseFloatAndValidate(coordinates[1])
      const xmax = parseFloatAndValidate(coordinates[2])
      const ymax = parseFloatAndValidate(coordinates[3])

      return [xmin, ymin, xmax, ymax]
    },
    validate(v) {
      validateBbox(v)
    },
    description: 'filtre avec une bbox suivant l\'ordre xmin, ymin, xmax, ymax',
    example: '48.573569106948469,27.837770518544438,48.417446881093412,27.381161181879751'
  }
}

export function extractParams(query) {
  return extractSingleParams(normalizeQuery(query), AUTOCOMPLETE)
}
