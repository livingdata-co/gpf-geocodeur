import {createInstance} from '../../../lib/spatial-index/lmdb.js'
import {ADDRESS_INDEX_MDB_PATH} from '../util/paths.js'

export async function createDatabase() {
  const dbInstance = createInstance(ADDRESS_INDEX_MDB_PATH, {
    geometryType: 'Point',
    readOnly: true,
    cache: true
  })

  function getCompleteFeatureByIdx(idx) {
    let feature = dbInstance.getFeatureByIdx(idx)

    if (feature.properties.type === 'housenumber') {
      const street = dbInstance.getFeatureById(feature.properties.street)

      if (!street) {
        throw new Error(`No matching street for id ${feature.properties.street}`)
      }

      feature = prepareHousenumber(feature, street)
    } else if (feature.properties.type === 'municipality') {
      feature = prepareMunicipality(feature)
    } else {
      // Type 'street' or 'locality'
      feature = prepareStreet(feature)
    }

    return feature
  }

  return {
    getCompleteFeatureByIdx
  }
}

const STREET_FIELDS = [
  'name',
  'postcode',
  'citycode',
  'city',
  'oldcitycode',
  'oldcity',
  'district',
  'context',
  'importance',
  'id',
  'banId',
  'lon',
  'lat',
  'x',
  'y'
]

const MUNICIPALITY_FIELDS = [
  'name',
  'postcode',
  'citycode',
  'city',
  'population',
  'context',
  'importance',
  'id',
  'banId',
  'lon',
  'lat',
  'x',
  'y'
]

const HN_STREET_FIELDS = [
  'postcode',
  'citycode',
  'city',
  'oldcitycode',
  'oldcity',
  'district',
  'context',
  'importance'
]

const HN_FIELDS = [
  'housenumber',
  'id',
  'banId',
  'lon',
  'lat',
  'x',
  'y'
]

export function prepareHousenumber(hnFeature, streetFeature) {
  const streetProperties = pickValues(streetFeature.properties, HN_STREET_FIELDS)
  const hnProperties = pickValues(hnFeature.properties, HN_FIELDS)

  const properties = {
    type: 'housenumber',
    name: `${hnFeature.properties.housenumber} ${streetFeature.properties.name}`,
    label: `${hnFeature.properties.housenumber} ${streetFeature.properties.name} ${streetProperties.postcode} ${streetProperties.city}`,
    street: streetFeature.properties.name,
    ...streetProperties,
    ...hnProperties
  }

  return {...hnFeature, properties}
}

export function prepareMunicipality(feature) {
  const properties = {
    type: 'municipality',
    ...pickValues(feature.properties, MUNICIPALITY_FIELDS),
    label: `${feature.properties.postcode} ${feature.properties.city}`
  }

  return {...feature, properties}
}

export function prepareStreet(feature) {
  const properties = {
    type: feature.properties.type,
    ...pickValues(feature.properties, STREET_FIELDS),
    label: `${feature.properties.name} ${feature.properties.postcode} ${feature.properties.city}`
  }

  return {...feature, properties}
}

export function pickValues(item, values) {
  const result = {}

  for (const key of values) {
    if (item[key] === undefined) {
      continue
    }

    result[key] = Array.isArray(item[key])
      ? item[key][0]
      : item[key]
  }

  return result
}
