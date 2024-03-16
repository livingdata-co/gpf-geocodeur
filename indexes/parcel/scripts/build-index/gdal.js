import gdal from 'gdal-async'

import logger from '../../../../lib/logger.js'

const wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')

export async function * readFeatures(datasetPath, transformFn = f => f) {
  const ds = gdal.open(datasetPath)
  const layer = ds.layers.get(0)
  const transformation = new gdal.CoordinateTransformation(layer.srs, wgs84)

  for await (const feature of layer.features) {
    const properties = feature.fields.toObject()
    const geometry = feature.getGeometry()

    if (!geometry) {
      logger.log('Missing geometry')
      continue
    }

    await geometry.transformAsync(transformation)

    yield transformFn({
      type: 'Feature',
      properties,
      geometry: geometry.toObject()
    })
  }

  ds.close()
}
