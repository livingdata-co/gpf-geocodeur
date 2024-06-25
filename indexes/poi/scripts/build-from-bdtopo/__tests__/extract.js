import {Buffer} from 'node:buffer'
import test from 'ava'
import gdal from 'gdal-async'
import {computeFields, extractFeatures, computeImportance, setToUndefinedIfEmpty, isMetropole} from '../extract.js'
import {createAccumulator} from '../categories.js'

test('computeFields', t => {
  const fieldsDefinition = {
    simple: '🫶🏻',
    computed: ({toto}) => `${toto}|🦆`,
    simpleArray: '🍍',
    computedArray: ({blablu}) => (['🍋', blablu, '🍋'])
  }

  const computedFieldsSchema = {
    simple: String,
    computed: String,
    simpleArray: Array,
    computedArray: Array
  }

  t.deepEqual(
    computeFields({toto: '💄', blablu: '🐬'}, fieldsDefinition, computedFieldsSchema),
    {
      simple: '🫶🏻',
      computed: '💄|🦆',
      simpleArray: ['🍍'],
      computedArray: ['🍋', '🐬']
    }
  )
})

function createFakeCommunesIndex(intersectingCommune) {
  let _closed = false

  return {
    getIntersectingCommunes() {
      return intersectingCommune
    },

    async close() {
      _closed = true
    },

    closed: _closed
  }
}

test('extractFeatures', async t => {
  const communesIndex = createFakeCommunesIndex(['57463'])
  const cleabsUniqIndex = new Set()
  const categoriesAccumulator = createAccumulator(['cat1', 'cat2'])

  const layersDefinitions = {
    layer1: {
      filter: ({toRemove}) => !toRemove,
      fields: {
        name: ({name}) => `prefix|${name}`,
        classification: 7,
        category: ['cat1', 'subcat1']
      },
      extrafields: {
        foo: 'bar'
      },
      computeCommunes: true
    }
  }
  const computedFieldsSchema = {
    name: Array,
    classification: Number,
    category: Array
  }

  const dataset = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {},
        properties: {
          toRemove: true
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            6.174_284_8,
            49.121_918_1
          ]
        },
        properties: {
          name: 'gymnase',
          cleabs: 'ABCDEF'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            6.174_284_8,
            49.121_918_1
          ]
        },
        properties: {
          name: 'gymnase',
          cleabs: 'ABCDEF'
        }
      }
    ]
  }

  gdal.vsimem.set(Buffer.from(JSON.stringify(dataset)), '/vsimem/layer1.geojson')

  const features = []
  const featuresIterator = extractFeatures({
    datasetPath: '/vsimem/layer1.geojson',
    layersDefinitions,
    cleabsUniqIndex,
    communesIndex,
    categoriesAccumulator,
    computedFieldsSchema,
    codeDepartement: '57'
  })

  for await (const feature of featuresIterator) {
    features.push(feature)
  }

  gdal.vsimem.release('/vsimem/layer1.geojson')

  t.true(cleabsUniqIndex.has('ABCDEF'))

  t.deepEqual(features, [
    '{"name":["prefix|gymnase"],"classification":7,"category":["cat1","subcat1"],"importance":0.4,"extrafields":{"foo":"bar","cleabs":"ABCDEF"},"citycode":["57463","57"],"city":["Metz"],"postcode":["57000","57050","57070"],"truegeometry":"{\\"type\\":\\"Point\\",\\"coordinates\\":[6.174285,49.121918]}","lon":6.174285,"lat":49.121918,"territory":"METROPOLE"}\n'
  ])
})

test('computeImportance', t => {
  t.is(computeImportance(), 0.4)
  t.is(computeImportance(1), 1)
  t.is(computeImportance(4), 0.7)
  t.is(computeImportance(9), 0.2)
})

test('setToUndefinedIfEmpty', t => {
  t.is(setToUndefinedIfEmpty('foo'), 'foo')
  t.is(setToUndefinedIfEmpty(false), false)
  t.is(setToUndefinedIfEmpty(1), 1)
  t.deepEqual(setToUndefinedIfEmpty(['foo']), ['foo'])
  t.is(setToUndefinedIfEmpty([]), undefined)
})

test('isMetropole', t => {
  t.true(isMetropole('01'))
  t.true(isMetropole('2A'))
  t.true(isMetropole('95'))
  t.false(isMetropole('971'))
  t.false(isMetropole('977'))
})
