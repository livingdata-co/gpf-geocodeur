import test from 'ava'
import {search} from '../search.js'

test('search', async t => {
  const params = {
    q: 'Test',
    returntruegeometry: true
  }

  const db = {
    getFeatureById(id) {
      if (id === '12345') {
        return {
          properties: {
            name: 'Test Place A',
            toponym: 'Test Toponym A',
            category: 'Test Category A',
            score: 0.9
          },
          geometry: {
            type: 'Point',
            coordinates: [1.234, 5.678]
          }
        }
      }

      if (id === '123456') {
        return {
          properties: {
            name: 'Test Place B',
            toponym: 'Test Toponym B',
            category: 'Test Category B',
            score: 0.8
          },
          geometry: {
            type: 'Point',
            coordinates: [2, 40]
          }
        }
      }
    }
  }

  const addokCluster = {
    async geocode() {
      return [
        {
          properties: {
            id: '12345',
            score: 0.9
          },
          geometry: {
            type: 'Point',
            coordinates: [1.234, 5.678]
          }
        },
        {
          properties: {
            id: '123456',
            score: 0.8
          },
          geometry: {
            type: 'Point',
            coordinates: [2, 40]
          }
        }
      ]
    }
  }

  const results = await search(params, {db, addokCluster})

  t.deepEqual(results, [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [1.234, 5.678]
      },
      properties: {
        name: 'Test Place A',
        toponym: 'Test Toponym A',
        category: 'Test Category A',
        score: 0.9,
        truegeometry: '{"type":"Point","coordinates":[1.234,5.678]}'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [2, 40]
      },
      properties: {
        name: 'Test Place B',
        toponym: 'Test Toponym B',
        category: 'Test Category B',
        score: 0.8,
        truegeometry: '{"type":"Point","coordinates":[2,40]}'
      }
    }
  ])
})
