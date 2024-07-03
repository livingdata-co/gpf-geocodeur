import test from 'ava'
import {formatResult, checkConfig, getById, search, reverse, asArray, structuredSearch, buildSearchPattern} from '../search.js'

test('checkConfig / no db', t => {
  t.throws(() => checkConfig({db: 'database'}), {
    message: 'search must be called with db and rtreeIndex params'
  })
})

test('getById', t => {
  const options = {
    db: {
      getFeatureById() {
        return {
          type: 'Feature',
          properties: {
            lon: 12,
            lat: 8
          },
          geometry: {
            type: 'Point',
            coordinates: [12, 8]
          }
        }
      }
    },
    rtreeIndex: 'index',
    id: 1,
    center: [2, 4],
    returntruegeometry: true
  }

  const result = getById(options)

  t.deepEqual(result, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {
      city: undefined,
      distance: 1_191_724,
      score: 0,
      truegeometry: {
        type: 'Point',
        coordinates: [12, 8]
      }
    }
  })
})

test('getById / no db', t => {
  t.throws(() => getById({options: null}), {
    message: 'db is required'
  })
})

test('asArray', t => {
  const newArray = asArray('coucou')
  const emptyArray = asArray()

  t.deepEqual(newArray, ['coucou'])
  t.deepEqual(emptyArray, [])
})

test('search / no limit', t => {
  const options = {
    rtreeIndex: 'index',
    db: 'database',
    center: [2, 3],
    returntruegeometry: true
  }

  t.throws(() => search(options), {
    message: 'limit is a required param'
  })
})

test('structuredSearch', t => {
  const db = {
    getFeatureById(id) {
      if (id === '540840000A1234') {
        return {
          type: 'Feature',
          properties: {
            id: '540840000A1234',
            departmentcode: '54',
            municipalitycode: '084',
            oldmunicipalitycode: '000',
            sheet: '01',
            section: '0A',
            number: '1234',
            lon: null,
            lat: null
          },
          geometry: {}
        }
      }

      if (id === '540840000A1235') {
        return {
          type: 'Feature',
          properties: {
            id: '540840000A1235',
            departmentcode: '54',
            municipalitycode: '084',
            oldmunicipalitycode: '000',
            sheet: '02',
            section: '0A',
            number: '1235',
            lon: null,
            lat: null
          },
          geometry: {}
        }
      }

      if (id === '540840000B1235') {
        return {
          type: 'Feature',
          properties: {
            id: '540840000B1235',
            departmentcode: '54',
            municipalitycode: '084',
            oldmunicipalitycode: '000',
            sheet: '01',
            section: '0B',
            number: '1235',
            lon: null,
            lat: null
          },
          geometry: {}
        }
      }
    },
    idIdxDb: {
      getKeys() {
        return [
          '540840000A1234',
          '540840000A1235',
          '540840000B1235'
        ]
      }
    }
  }

  t.deepEqual(structuredSearch({
    db,
    limit: 5,
    filters: {
      departmentcode: '54',
      municipalitycode: '084',
      section: '0A'
    }
  }), [
    {
      type: 'Feature',
      properties: {
        id: '540840000A1234',
        city: 'Mont-Bonvillers',
        departmentcode: '54',
        municipalitycode: '084',
        oldmunicipalitycode: '000',
        sheet: '01',
        section: '0A',
        number: '1234'
      },
      geometry: {type: 'Point', coordinates: [null, null]}
    },
    {
      type: 'Feature',
      properties: {
        id: '540840000A1235',
        city: 'Mont-Bonvillers',
        departmentcode: '54',
        municipalitycode: '084',
        oldmunicipalitycode: '000',
        sheet: '02',
        section: '0A',
        number: '1235'
      },
      geometry: {type: 'Point', coordinates: [null, null]}
    }
  ])

  t.deepEqual(structuredSearch({
    db,
    limit: 5,
    filters: {
      departmentcode: '54',
      municipalitycode: '084',
      section: '0A',
      sheet: '02'
    }
  }), [
    {
      type: 'Feature',
      properties: {
        id: '540840000A1235',
        city: 'Mont-Bonvillers',
        departmentcode: '54',
        municipalitycode: '084',
        oldmunicipalitycode: '000',
        sheet: '02',
        section: '0A',
        number: '1235'
      },
      geometry: {type: 'Point', coordinates: [null, null]}
    }
  ])

  t.deepEqual(structuredSearch({
    db,
    limit: 5,
    filters: {
      departmentcode: '54',
      municipalitycode: '084',
      oldmunicipalitycode: '000',
      section: '0A',
      number: '1234',
      sheet: '02'
    }
  }), [])
})

test('search / no center', t => {
  const options = {
    rtreeIndex: 'index',
    db: 'database',
    returntruegeometry: true,
    limit: 2
  }

  t.throws(() => search(options), {
    message: 'Parcel search requires filters or center'
  })
})

test('search / q', t => {
  const options = {
    db: {
      getFeatureById() {
        return {
          type: 'Feature',
          properties: {
            lon: 12,
            lat: 8
          },
          geometry: {
            type: 'Point',
            coordinates: [12, 8]
          }
        }
      }
    },
    q: 'oh !',
    rtreeIndex: {
      neighbors() {
        return 'ok'
      }
    },
    id: 1,
    center: [2, 4],
    limit: 1,
    filters: {un: 'filtre'},
    returntruegeometry: true
  }

  const result = search(options)

  t.truthy(result)
})

test('search / center', t => {
  const options = {
    db: {
      getFeatureById() {
        return {
          type: 'Feature',
          properties: {
            lon: 12,
            lat: 8
          },
          geometry: {
            type: 'Point',
            coordinates: [12, 8]
          }
        }
      }
    },
    rtreeIndex: {
      neighbors() {
        return 'ok'
      }
    },
    center: [2, 4],
    limit: 1,
    filters: {un: 'filtre'},
    returntruegeometry: true
  }

  const result = search(options)

  t.truthy(result)
})

test('search / filters', t => {
  const options = {
    db: {
      getFeatureById() {
        return {
          type: 'Feature',
          properties: {
            lon: 12,
            lat: 8
          },
          geometry: {
            type: 'Point',
            coordinates: [12, 8]
          }
        }
      },
      idIdxDb: {
        getKeys() {
          return [
            121_010,
            101_212,
            281_182
          ]
        }
      }
    },
    rtreeIndex: {
      neighbors() {
        return 'ok'
      }
    },
    limit: 1,
    filters: {
      departmentcode: 55,
      municipalitycode: 55_210
    },
    returntruegeometry: true
  }

  const result = search(options)

  t.truthy(result)
})

test('reverse / no db', t => {
  t.throws(() => reverse({}, {options: 'sans'}), {
    message: 'db is required'
  })
})

test('reverse', t => {
  const result = reverse(
    {limit: 1, center: [2, 3]},
    {db: 'database', rtreeIndex: 'index'}
  )

  t.truthy(result)
})

test('formatResult', t => {
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    }
  }

  const formatedResult = formatResult(feature, {distanceCache: 8})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {city: undefined, distance: 8, score: 0.9992}
  })
})

test('formatResult / center', t => {
  const center = [9, 4]
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    }
  }

  const formatedResult = formatResult(feature, {center})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {city: undefined, distance: 554_839, score: 0}
  })
})

test('formatResult / returntruegeometry', t => {
  const center = [9, 4]
  const feature = {
    properties: {
      lon: 12,
      lat: 8
    },
    geometry: {
      type: 'Point',
      coordinates: [12, 8]
    }
  }

  const formatedResult = formatResult(feature, {center, returntruegeometry: true})

  t.deepEqual(formatedResult, {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [12, 8]},
    properties: {
      city: undefined,
      distance: 554_839,
      score: 0,
      truegeometry: {
        type: 'Point',
        coordinates: [12, 8]
      }
    }
  })
})

test('buildSearchPattern / general', t => {
  t.throws(() => buildSearchPattern({}), {message: 'departmentcode is required for structured search'})
  t.throws(() => buildSearchPattern({departmentcode: '75'}), {message: 'municipalitycode or districtcode is required for structured search'})

  t.is(buildSearchPattern({
    departmentcode: '54',
    municipalitycode: '084'
  }), '54084000******')

  t.is(buildSearchPattern({
    departmentcode: '54',
    municipalitycode: '084',
    oldmunicipalitycode: '123'
  }), '54084123******')

  t.is(buildSearchPattern({
    departmentcode: '54',
    municipalitycode: '084',
    section: 'AZ'
  }), '54084000AZ****')

  t.is(buildSearchPattern({
    departmentcode: '54',
    municipalitycode: '084',
    section: 'AZ',
    number: '0001'
  }), '54084000AZ0001')
})

test('buildSearchPattern / Paris', t => {
  t.is(buildSearchPattern({
    departmentcode: '75',
    districtcode: '101'
  }), '75101000******')

  t.is(buildSearchPattern({
    departmentcode: '75',
    municipalitycode: '056'
  }), '75***000******')

  t.is(buildSearchPattern({
    departmentcode: '75',
    municipalitycode: '056',
    districtcode: '101'
  }), '75101000******')
})

test('buildSearchPattern / Lyon', t => {
  t.is(buildSearchPattern({
    departmentcode: '69',
    districtcode: '381'
  }), '69381000******')

  t.is(buildSearchPattern({
    departmentcode: '69',
    municipalitycode: '123'
  }), '6938*000******')

  t.is(buildSearchPattern({
    departmentcode: '69',
    municipalitycode: '123',
    districtcode: '381'
  }), '69381000******')
})

test('buildSearchPattern / Marseille', t => {
  t.is(buildSearchPattern({
    departmentcode: '13',
    districtcode: '201'
  }), '13201000******')

  t.is(buildSearchPattern({
    departmentcode: '13',
    municipalitycode: '055'
  }), '132**000******')

  t.is(buildSearchPattern({
    departmentcode: '13',
    municipalitycode: '055',
    districtcode: '201'
  }), '13201000******')
})
