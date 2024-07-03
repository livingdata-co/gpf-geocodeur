import {prepareParams} from '../../../lib/addok/prepare-params.js'

export async function search(params, options) {
  const {addokCluster, signal, priority} = options

  if (!addokCluster) {
    throw new Error('addokCluster is a required option')
  }

  const results = await addokCluster.geocode(prepareParams(params), {
    signal,
    priority
  })

  if (!params.returntruegeometry) {
    return results
  }

  return results.map(feature => {
    const truegeometry = JSON.stringify(feature.geometry)
    return {
      ...feature,
      properties: {...feature.properties, truegeometry}
    }
  })
}
