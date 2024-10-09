import createHttpError from 'http-errors'
import {ensureArray, extractIndexes} from '../api/csv/index.js'

export function extractGeocodeOptions(body, {columnsInFile}) {
  const geocodeOptions = {}

  if (body.columns) {
    geocodeOptions.columns = ensureArray(body.columns)

    if (geocodeOptions.columns.some(c => !columnsInFile.includes(c))) {
      throw createHttpError(400, 'At least one given column name is unknown')
    }
  } else {
    geocodeOptions.columns = columnsInFile
  }

  if (body.citycode) {
    geocodeOptions.citycode = body.citycode
  }

  if (body.postcode) {
    geocodeOptions.postcode = body.postcode
  }

  if (body.type) {
    geocodeOptions.type = body.type
  }

  if (body.category) {
    geocodeOptions.category = body.category
  }

  if (body.departmentcode) {
    geocodeOptions.departmentcode = body.departmentcode
  }

  if (body.municipalitycode) {
    geocodeOptions.municipalitycode = body.municipalitycode
  }

  if (body.oldmunicipalitycode) {
    geocodeOptions.oldmunicipalitycode = body.oldmunicipalitycode
  }

  if (body.districtcode) {
    geocodeOptions.districtcode = body.districtcode
  }

  if (body.section) {
    geocodeOptions.section = body.section
  }

  if (body.sheet) {
    geocodeOptions.sheet = body.sheet
  }

  if (body.number) {
    geocodeOptions.number = body.number
  }

  if (body.lon) {
    geocodeOptions.lon = body.lon
  }

  if (body.lat) {
    geocodeOptions.lat = body.lat
  }

  if (body.result_columns) {
    geocodeOptions.resultColumns = ensureArray(body.result_columns)
  }

  geocodeOptions.indexes = extractIndexes(body.indexes)

  return geocodeOptions
}
