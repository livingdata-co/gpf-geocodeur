import {pick} from 'lodash-es'
import {prepareParams} from '../../../lib/addok/prepare-params.js'

const CAD_FIELDS = [
  'name',
  'toponym',
  'category',
  'postcode',
  'citycode',
  'city',
  'extrafields',
  'classification',
  'territory',
  'nic',
  'lot',
  'lotissement',
  'section',
  'typologie',
  'surf_cad'
]

export async function search(params, {db, addokCluster, priority, signal}) {
  const results = await addokCluster.geocode(prepareParams(params), {priority, signal})

  return results.map(result => {
    const {id} = result.properties
    const storedFeature = db.getFeatureById(id)

    const properties = {
      ...pick(storedFeature.properties, CAD_FIELDS),
      score: result.properties.score
    }

    if (params.returntruegeometry) {
      properties.truegeometry = JSON.stringify(storedFeature.geometry)
    }

    return {
      type: 'Feature',
      geometry: result.geometry,
      properties
    }
  })
}
