import {createReadStream} from 'node:fs'
import {parse} from 'ndjson'
import {omit} from 'lodash-es'

export async function * extractFeatures(filePath) {
  const inputStream = createReadStream(filePath)
    .pipe(parse())

  for await (const row of inputStream) {
    yield asFeature(row)
  }
}

export function asFeature(poiEntry) {
  const properties = omit(poiEntry, ['truegeometry'])

  let geometry=null;
  if(properties.lon){
    geometry = {coordinates: [properties.lon, properties.lat], type: "Point"};
  }
  else{
    geometry = JSON.parse(poiEntry.truegeometry);
  }
  // On s'assure que le name commence par LOT 
  if(!properties.name.startsWith('LOT ')){
    properties.name = 'LOT ' + properties.name;
  }

  return {
    type: 'Feature',
    geometry,
    properties
  }
}
