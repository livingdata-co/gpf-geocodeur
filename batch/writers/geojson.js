import {Transform} from 'node:stream'

import {omit} from 'lodash-es'
import {stringify} from 'JSONStream'
import pumpify from 'pumpify'

const GEOJSON_OPEN = '{"type":"FeatureCollection","features": [\n'
const GEOJSON_SEP = ',\n'
const GEOJSON_CLOSE = '\n]}\n'

export function createWriteStream(lon = 'longitude', lat = 'latitude') {
  return pumpify.obj(
    new Transform({
      transform(row, enc, cb) {
        const geometry = row[lon] && row[lat]
          ? {type: 'Point', coordinates: [Number.parseFloat(row[lon]), Number.parseFloat(row[lat])]}
          : null

        cb(null, {
          type: 'Feature',
          geometry,
          properties: omit(row, lon, lat)
        })
      },

      objectMode: true
    }),
    stringify(GEOJSON_OPEN, GEOJSON_SEP, GEOJSON_CLOSE)
  )
}
