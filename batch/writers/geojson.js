import {Transform} from 'node:stream'

import {omit} from 'lodash-es'
import {stringify} from 'JSONStream'
import pumpify from 'pumpify'

const GEOJSON_OPEN = '{"type":"FeatureCollection","features": [\n'
const GEOJSON_SEP = ',\n'
const GEOJSON_CLOSE = '\n]}\n'

function createGeometry(row) {
  if (row.result_status !== 'ok') {
    return null
  }

  const lon = row.longitude || row.result_longitude
  const lat = row.latitude || row.result_latitude

  return lon && lat
    ? {type: 'Point', coordinates: [lon, lat]}
    : null
}

export function createWriteStream() {
  return pumpify.obj(
    new Transform({
      transform(row, enc, cb) {
        cb(null, {
          type: 'Feature',
          geometry: createGeometry(row),
          properties: omit(row, 'latitude', 'longitude', 'result_latitude', 'result_longitude')
        })
      },

      objectMode: true
    }),
    stringify(GEOJSON_OPEN, GEOJSON_SEP, GEOJSON_CLOSE)
  )
}
