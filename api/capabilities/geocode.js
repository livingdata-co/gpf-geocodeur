import got from 'got'
import process from 'node:process'
import {PARAMS} from '../params/base.js'
import readJson from '../../lib/read-json.js'

let _capabilities = null
let _capabilitiesDate = null

const FIVE_MINUTES = 5 * 60 * 1000

export default async function computeGeocodeCapabilities() {
  if (_capabilities && (Date.now() - _capabilitiesDate < FIVE_MINUTES)) {
    return _capabilities
  }

  const {searchParameters, reverseParameters} = groupParamsByOperation()
  const capabilities = await readJson('./config/capabilities/geocode/base.json')
  const addressCapabilities = await readJson('./config/capabilities/geocode/address.json')
  const parcelCapabilities = await readJson('./config/capabilities/geocode/parcel.json')
  const poiCapabilities = await readJson('./config/capabilities/geocode/poi.json')
  const cadastreCapabilities = await readJson('./config/capabilities/geocode/cadastre.json')
  const categories = await getCategories()

  poiCapabilities.fields[0].values = categories

  capabilities.operations[0].parameters = searchParameters
  capabilities.operations[1].parameters = reverseParameters
  capabilities.indexes = [addressCapabilities, poiCapabilities, /*parcelCapabilities,*/ cadastreCapabilities]

  _capabilities = capabilities
  _capabilitiesDate = Date.now()

  return capabilities
}

function groupParamsByOperation() {
  const searchParameters = []
  const reverseParameters = []

  for (const k of Object.keys(PARAMS)) {
    const {nameInQuery, description, required, type, example, allowedValues} = PARAMS[k]

    const capabilitiesParams = {
      name: nameInQuery || k,
      in: 'query',
      description,
      required: required || false,
      default: PARAMS[k].defaultValue,
      schema: {
        type: type === 'float' ? 'number' : type,
        example,
        enum: (nameInQuery === 'index' || k === 'type') ? allowedValues : undefined
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

async function getCategories() {
  const data = await got.get(`${process.env.POI_INDEX_URL}/categories`).json()

  return data
}
