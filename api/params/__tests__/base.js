import test from 'ava'
import {extractParam} from '../../util/params.js'
import {PARAMS, extractSearchParams, extractReverseParams, validateSearchgeom, validateLonLat, hasStructuredSearchParams} from '../base.js'

test('validateSearchgeom', t => {
  t.is(validateSearchgeom({type: 'Circle', coordinates: [2.1, 48.5], radius: 100}), undefined)
  t.is(validateSearchgeom({type: 'Point', coordinates: [2, 48.5]}), undefined)

  t.is(validateSearchgeom({type: 'LineString', coordinates: [
    [2.334_35, 48.808_28],
    [2.337_03, 48.805_08],
    [2.341_53, 48.806_12]
  ]}), undefined)

  t.is(validateSearchgeom({type: 'Polygon', coordinates: [
    [
      [2.294_561, 48.819_186],
      [2.294_561, 48.815_74],
      [2.301_376_758_780_947, 48.815_74],
      [2.301_376, 48.819_186],
      [2.294_561, 48.819_186]
    ]
  ]}), undefined)

  t.throws(() => validateSearchgeom({type: 'foo', coordinates: [2.1, 48.5]}), {message: 'geometry type (foo) not allowed'})
  t.throws(() => validateSearchgeom({coordinates: [2.1, 48.5]}), {message: 'geometry object must have a \'type\' property'})
  t.throws(() => validateSearchgeom({type: 'Point'}), {message: 'geometry not valid: This GeoJSON object requires a coordinates member but it is missing.'})

  t.throws(
    () => validateSearchgeom({type: 'Circle', coordinates: [2.1, 48.5]}),
    {message: 'geometry not valid: radius property is missing'})

  t.throws(
    () => validateSearchgeom({type: 'Circle', coordinates: [2.1, 48.5], radius: 'foo'}),
    {message: 'geometry not valid: radius must be a positive float'})

  t.throws(() => validateSearchgeom({type: 'LineString', coordinates: [
    ['foo', 48.8],
    [2.3, 49.8],
    [2.3, 50.8]
  ]}), {message: 'geometry not valid: Each element in a position must be a number.'})
})

test('validateSearchgeom / wrong structure', t => {
  t.throws(
    () => validateSearchgeom({type: 'Point', coordinates: [48.5]}),
    {message: 'geometry not valid: A position should have 2 or 3 elements - found 1.'})

  t.throws(
    () => validateSearchgeom({type: 'Circle', coordinates: [48.5], radius: 100}),
    {message: 'geometry not valid: Coordinates must be an array of two entries'})

  t.throws(
    () => validateSearchgeom({type: 'LineString', coordinates: [2.1]}),
    {message: 'geometry not valid: Expected to find a position here, found another type.'})

  t.throws(
    () => validateSearchgeom({type: 'LineString', coordinates: [2.1, 48.5]}),
    {message: 'geometry not valid: Expected to find a position here, found another type.'})

  t.throws(
    () => validateSearchgeom({type: 'Polygon', coordinates: [2.1, 48.5]}),
    {message: 'geometry not valid: Expected to find an array of positions here.'})

  t.throws(
    () => validateSearchgeom({type: 'Polygon', coordinates: [
      [
        [2.3, 48.8],
        [4.3, 49.8]
      ]
    ]}),
    {message: 'geometry not valid: Expected to find four or more positions here.'})

  t.throws(
    () => validateSearchgeom({type: 'Polygon', coordinates: [
      [
        [2.3, 48.8],
        [4.3, 49.8],
        [3.5, 50.1],
        [2.3, 48.8]
      ],
      [
        [2.8, 49.2],
        [3.2, 49.2]
      ]
    ]}),
    {message: 'geometry not valid: Expected to find four or more positions here.'})
})

test('validateSearchgeom / geometry too large', t => {
  t.throws(
    () => validateSearchgeom({coordinates: [
      [
        [1.7478, 49.1334],
        [1.7478, 48.5391],
        [3.0129, 48.5391],
        [3.0129, 49.1334],
        [1.7478, 49.1334]
      ]
    ], type: 'Polygon'}),
    {message: 'geometry is too big: bbox max length must be less than 1000m'}
  )
})

test('extractParam / q', t => {
  function extractQ(q) {
    return extractParam({q}, 'q', PARAMS.q, PARAMS)
  }

  t.is(extractQ('foo'), 'foo')
  t.is(extractQ(' foo '), 'foo')
  t.is(extractQ(''), undefined)

  t.throws(
    () => extractQ('aa'),
    {message: 'q: must contain between 3 and 200 chars and start with a number or a letter'}
  )
  t.throws(
    () => extractQ('-aaa'),
    {message: 'q: must contain between 3 and 200 chars and start with a number or a letter'}
  )
  t.throws(
    () => extractQ('   aa'),
    {message: 'q: must contain between 3 and 200 chars and start with a number or a letter'}
  )
  t.throws(
    () => extractQ(Array.from({length: 300}).fill('a').join('')),
    {message: 'q: must contain between 3 and 200 chars and start with a number or a letter'}
  )
})

test('extractParam / limit', t => {
  function validateLimit(limit) {
    return extractParam({limit}, 'limit', PARAMS.limit, PARAMS)
  }

  t.is(validateLimit('1'), 1)
  t.is(validateLimit('5'), 5)
  t.is(validateLimit('20'), 20)
  t.is(validateLimit(''), 10)

  for (const limit of ['0', '-1', '101']) {
    t.throws(() => validateLimit(limit), {message: 'limit: must be an integer between 1 and 50'})
  }

  for (const limit of ['0.5', 'foo']) {
    t.throws(() => validateLimit(limit), {message: 'limit: unable to parse value as integer'})
  }
})

test('extractParam / indexes', t => {
  function extractIndexes(index) {
    return extractParam({index}, 'indexes', PARAMS.indexes, PARAMS)
  }

  t.deepEqual(extractIndexes('address'), ['address'])
  t.deepEqual(extractIndexes('address,poi'), ['address', 'poi'])
  t.deepEqual(extractIndexes('address,poi,poi'), ['address', 'poi']) // Dedupe
  t.deepEqual(extractIndexes('address,poi,parcel'), ['address', 'poi', 'parcel'])
  t.deepEqual(extractIndexes(''), ['address'])
  t.deepEqual(extractIndexes(), ['address'])

  t.throws(() => extractIndexes('foo,bar'), {message: 'index: unexpected value \'foo\''})
  t.throws(() => extractIndexes('address,foo'), {message: 'index: unexpected value \'foo\''})
})

test('extractParam / lon-lat', t => {
  function extractLon(lon) {
    return extractParam({lon}, 'lon', PARAMS.lon, PARAMS)
  }

  function extractLat(lat) {
    return extractParam({lat}, 'lat', PARAMS.lat, PARAMS)
  }

  t.is(extractLat('1'), 1)
  t.is(extractLat('1.1'), 1.1)
  t.is(extractLat('-66.56'), -66.56)
  t.is(extractLat('66.56'), 66.56)

  t.is(extractLon('1'), 1)
  t.is(extractLon('1.1'), 1.1)
  t.is(extractLon('-166.56'), -166.56)
  t.is(extractLon('166.56'), 166.56)

  t.throws(() => extractLat('a'), {message: 'lat: unable to parse value as float'})
  t.throws(() => extractLat('-95'), {message: 'lat: must be a float between -90 and 90'})

  t.throws(() => extractLon('a'), {message: 'lon: unable to parse value as float'})
  t.throws(() => extractLon('-195'), {message: 'lon: must be a float between -180 and 180'})
})

test('extractParam / type', t => {
  function extractType(type) {
    return extractParam({type}, 'type', PARAMS.type, PARAMS)
  }

  t.is(extractType('housenumber'), 'housenumber')
  t.is(extractType('street'), 'street')
  t.is(extractType('locality'), 'locality')
  t.is(extractType('municipality'), 'municipality')

  t.throws(() => extractType('foo'), {message: 'type: unexpected value \'foo\''})
  t.throws(() => extractType('housenumber bar'), {message: 'type: unexpected value \'housenumber bar\''})
})

test('extractParam / postcode', t => {
  function extractPostcode(postcode) {
    return extractParam({postcode}, 'postcode', PARAMS.postcode, PARAMS)
  }

  t.is(extractPostcode('12345'), '12345')

  t.throws(() => extractPostcode('1234'), {message: 'postcode: must contain 5 digits'})
  t.throws(() => extractPostcode('123456'), {message: 'postcode: must contain 5 digits'})
  t.throws(() => extractPostcode('12E45'), {message: 'postcode: must contain 5 digits'})
})

test('extractParam / citycode', t => {
  function extractCitycode(citycode) {
    return extractParam({citycode}, 'citycode', PARAMS.citycode, PARAMS)
  }

  t.is(extractCitycode('12345'), '12345')
  t.is(extractCitycode('1A345'), '1A345')
  t.is(extractCitycode('1B345'), '1B345')

  t.throws(() => extractCitycode('12A45'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('A1245'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('123A5'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('1234A'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('1a345'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('1b345'), {message: 'citycode: not valid'})
  t.throws(() => extractCitycode('1A3456'), {message: 'citycode: not valid'})
})

test('extractParam / city', t => {
  function extractCity(city) {
    return extractParam({city}, 'city', PARAMS.city, PARAMS)
  }

  t.is(extractCity('foo'), 'foo')
  t.is(extractCity(' foo '), 'foo')
  t.is(extractCity(' foo-bar'), 'foo-bar')
  t.is(extractCity('Y'), 'Y')
  t.is(extractCity(''), undefined)

  t.throws(
    () => extractCity(Array.from({length: 60}).fill('a').join('')),
    {message: 'city: must contain between 1 and 50 chars'}
  )
})

test('extractParam / category', t => {
  function extractCategory(category) {
    return extractParam({category}, 'category', PARAMS.category, PARAMS)
  }

  t.is(extractCategory('aérodrome'), 'aérodrome')
  t.is(extractCategory('administratif'), 'administratif')
  t.is(extractCategory('barrage'), 'barrage')
  t.is(extractCategory(''), undefined)
})

test('extractParam / returntruegeometry', t => {
  function extractReturntruegeometry(returntruegeometry) {
    return extractParam({returntruegeometry}, 'returntruegeometry', PARAMS.returntruegeometry, PARAMS)
  }

  t.is(extractReturntruegeometry(''), undefined)
  t.is(extractReturntruegeometry(' '), undefined)
  t.true(extractReturntruegeometry(' true '))
  t.true(extractReturntruegeometry('yes'))
  t.true(extractReturntruegeometry('1'))
  t.false(extractReturntruegeometry(' false '))
  t.false(extractReturntruegeometry('no'))
  t.false(extractReturntruegeometry('0'))
  t.throws(() => extractReturntruegeometry('a'), {message: 'returntruegeometry: unable to parse value as boolean'})
})

test('extractParam / departmentcode', t => {
  function extractDepartmentcode(departmentcode) {
    return extractParam({departmentcode}, 'departmentcode', PARAMS.departmentcode, PARAMS)
  }

  t.is(extractDepartmentcode('01'), '01')
  t.is(extractDepartmentcode('2A'), '2A')
  t.is(extractDepartmentcode('2B'), '2B')
  t.is(extractDepartmentcode('97'), '97')

  t.throws(() => extractDepartmentcode('20'), {message: 'departmentcode: not valid'})
  t.throws(() => extractDepartmentcode('971'), {message: 'departmentcode: not valid'})
  t.throws(() => extractDepartmentcode('3A'), {message: 'departmentcode: not valid'})
  t.throws(() => extractDepartmentcode('001'), {message: 'departmentcode: not valid'})
  t.throws(() => extractDepartmentcode('12345'), {message: 'departmentcode: not valid'})
})

test('extractParam / municipalitycode', t => {
  function extractMunicipalitycode(municipalitycode) {
    return extractParam({municipalitycode}, 'municipalitycode', PARAMS.municipalitycode, PARAMS)
  }

  t.is(extractMunicipalitycode('123'), '123')
  t.is(extractMunicipalitycode('001'), '001')
  t.is(extractMunicipalitycode('01'), '01')

  t.throws(() => extractMunicipalitycode('1234'), {message: 'municipalitycode: not valid'})
  t.throws(() => extractMunicipalitycode('12A'), {message: 'municipalitycode: not valid'})
  t.throws(() => extractMunicipalitycode('A12'), {message: 'municipalitycode: not valid'})
  t.throws(() => extractMunicipalitycode('1A3'), {message: 'municipalitycode: not valid'})
})

test('extractParam / oldmunicipalitycode', t => {
  function extractOldmunicipalitycode(oldmunicipalitycode) {
    return extractParam({oldmunicipalitycode}, 'oldmunicipalitycode', PARAMS.oldmunicipalitycode, PARAMS)
  }

  t.is(extractOldmunicipalitycode('123'), '123')
  t.is(extractOldmunicipalitycode('000'), '000')

  t.throws(() => extractOldmunicipalitycode('01'), {message: 'oldmunicipalitycode: not valid'})
  t.throws(() => extractOldmunicipalitycode('1234'), {message: 'oldmunicipalitycode: not valid'})
  t.throws(() => extractOldmunicipalitycode('12A'), {message: 'oldmunicipalitycode: not valid'})
  t.throws(() => extractOldmunicipalitycode('A12'), {message: 'oldmunicipalitycode: not valid'})
  t.throws(() => extractOldmunicipalitycode('1A3'), {message: 'oldmunicipalitycode: not valid'})
})

test('extractParam / districtcode', t => {
  function extractDistrictcode(districtcode) {
    return extractParam({districtcode}, 'districtcode', PARAMS.districtcode, PARAMS)
  }

  t.is(extractDistrictcode('123'), '123')

  t.throws(() => extractDistrictcode('1A2'), {message: 'districtcode: not valid'})
  t.throws(() => extractDistrictcode('1'), {message: 'districtcode: not valid'})
  t.throws(() => extractDistrictcode('1234'), {message: 'districtcode: not valid'})
})

test('extractParam / section', t => {
  function extractSection(section) {
    return extractParam({section}, 'section', PARAMS.section, PARAMS)
  }

  t.is(extractSection('0A'), '0A')
  t.is(extractSection('1'), '01')
  t.is(extractSection('11'), '11')
  t.is(extractSection('A'), '0A')
  t.is(extractSection(''), undefined)

  t.throws(() => extractSection('A1'), {message: 'section: not valid'})
  t.throws(() => extractSection('ab'), {message: 'section: not valid'})
  t.throws(() => extractSection('b2'), {message: 'section: not valid'})
  t.throws(() => extractSection('aaa'), {message: 'section: not valid'})
  t.throws(() => extractSection('ba2'), {message: 'section: not valid'})
})

test('extractParam / number', t => {
  function extractNumber(number) {
    return extractParam({number}, 'number', PARAMS.number, PARAMS)
  }

  t.is(extractNumber('1234'), '1234')
  t.is(extractNumber('0011'), '0011')
  t.is(extractNumber('01'), '0001')
  t.is(extractNumber(''), undefined)

  t.throws(() => extractNumber('a12'), {message: 'number: not valid'})
  t.throws(() => extractNumber('12a'), {message: 'number: not valid'})
  t.throws(() => extractNumber('12345'), {message: 'number: not valid'})
})

test('extractParam / sheet', t => {
  function extractSheet(sheet) {
    return extractParam({sheet}, 'sheet', PARAMS.sheet, PARAMS)
  }

  t.is(extractSheet('1'), '01')
  t.is(extractSheet('01'), '01')
  t.is(extractSheet(''), undefined)

  t.throws(() => extractSheet('1234'), {message: 'sheet: not valid'})
  t.throws(() => extractSheet('a12'), {message: 'sheet: not valid'})
  t.throws(() => extractSheet('12a'), {message: 'sheet: not valid'})
})

test('extractSearchParams / all params', t => {
  t.deepEqual(extractSearchParams({
    foo: 'bar',
    limit: '10',
    lon: '6.5',
    lat: '60',
    q: 'foobar'
  }), {
    indexes: ['address'],
    limit: 10,
    lon: 6.5,
    lat: 60,
    q: 'foobar',
    autocomplete: true
  })
})

test('extractSearchParams / missing q parameter', t => {
  const error = t.throws(() => extractSearchParams({}), {message: 'Failed parsing query'})
  t.deepEqual(error.detail, ['q: required param'])
})

test('extractSearchParams / missing q but parcel only', t => {
  t.deepEqual(
    extractSearchParams({
      index: 'parcel',
      departmentcode: '57',
      municipalitycode: '415'
    }),
    {
      indexes: ['parcel'],
      limit: 10,
      autocomplete: true,
      departmentcode: '57',
      municipalitycode: '415'
    }
  )
})

test('extractSearchParams / city + parcel', t => {
  const error = t.throws(
    () => extractSearchParams({
      city: 'Foo Bar',
      q: 'toto',
      index: 'parcel'
    }),
    {message: 'Failed parsing query'}
  )

  t.deepEqual(error.detail, ['city cannot be used with parcel index'])
})

test('extractSearchParams / city + citycode', t => {
  const error = t.throws(
    () => extractSearchParams({
      city: 'Foo Bar',
      q: 'toto',
      citycode: '12345'
    }),
    {message: 'Failed parsing query'}
  )

  t.deepEqual(error.detail, ['city and citycode params cannot be used together'])
})

test('extractSearchParams / city / single result', t => {
  t.deepEqual(extractSearchParams({
    city: 'Lorry-lès-Metz',
    q: 'toto'
  }), {
    indexes: ['address'],
    limit: 10,
    city: 'Lorry-lès-Metz',
    citycode: '57415',
    q: 'toto',
    autocomplete: true
  })
})

test('extractSearchParams / city / no result', t => {
  const error = t.throws(
    () => extractSearchParams({
      city: 'Foo Bar',
      q: 'toto'
    }),
    {message: 'Failed parsing query'}
  )

  t.deepEqual(error.detail, ['city: No matching cities found'])
})

test('extractSearchParams / city / multiple results', t => {
  t.deepEqual(extractSearchParams({
    city: 'Nantes',
    q: 'toto'
  }), {
    indexes: ['address'],
    limit: 10,
    city: 'Nantes',
    matchingCities: [
      {
        code: '44109',
        nom: 'Nantes',
        score: 1
      },
      {
        code: '38273',
        nom: 'Nantes-en-Ratier',
        score: 0.875
      }
    ],
    q: 'toto Nantes',
    autocomplete: true
  })
})

test('extractSearchParams / q+structured params conflict', t => {
  const error = t.throws(
    () => extractSearchParams({q: 'foo', departmentcode: '57'}),
    {message: 'Failed parsing query'}
  )

  t.deepEqual(error.detail, ['q param and structured search cannot be used together'])
})

test('extractReverseParams / with searchgeom', t => {
  t.deepEqual(extractReverseParams({
    searchgeom: '{"type": "Circle", "coordinates": [2.1, 48.5], "radius": 100}',
    limit: '10'
  }), {
    indexes: ['address'],
    searchgeom: {
      type: 'Circle',
      coordinates: [2.1, 48.5],
      radius: 100
    },
    limit: 10,
    autocomplete: true
  })
})

test('extractReverseParams / searchgeom geometry not allowed', t => {
  const error = t.throws(
    () => extractReverseParams({searchgeom: '{"type": "Point", "coordinates": [2.1, 48.5]}'}), {message: 'Failed parsing query'})

  t.deepEqual(error.detail, ['Geometry type \'Point\' not allowed for address index'])
})

test('extractReverseParams / no searchgeom no lonlat', t => {
  const error = t.throws(
    () => extractReverseParams({}), {message: 'Failed parsing query'})

  t.deepEqual(error.detail, ['At least lon/lat or searchgeom must be defined'])
})

test('extractReverseParams / city / found', t => {
  t.deepEqual(extractReverseParams({
    city: 'Lorry-lès-Metz',
    lon: '2.1',
    lat: '48.5'
  }), {
    indexes: ['address'],
    limit: 10,
    city: 'Lorry-lès-Metz',
    citycode: ['57415'],
    lon: 2.1,
    lat: 48.5,
    autocomplete: true
  })
})

test('extractReverseParams / city / not found', t => {
  const error = t.throws(() => extractReverseParams({
    city: 'Plop',
    lon: '2.1',
    lat: '48.5'
  }))

  t.is(error.detail[0], 'city: No matching cities found')
})

test('extractReverseParams / city + parcel', t => {
  const error = t.throws(() => extractReverseParams({
    city: 'Metz',
    index: 'parcel,poi',
    lon: '2.1',
    lat: '48.5'
  }))

  t.is(error.detail[0], 'city cannot be used with parcel index')
})

test('extractReverseParams / city / conflict with citycode', t => {
  const error = t.throws(() => extractReverseParams({
    city: 'Metz',
    citycode: '12345',
    lon: '2.1',
    lat: '48.5'
  }))

  t.is(error.detail[0], 'city and citycode params cannot be used together')
})

test('validateLonLat', t => {
  t.throws(() => validateLonLat({lon: 1}))
  t.throws(() => validateLonLat({lat: 1}))
  t.notThrows(() => validateLonLat({lon: 1, lat: 1}))
  t.notThrows(() => validateLonLat({lon: 0, lat: 0, foo: 'bar'}))
})

test('hasStructuredSearchParams', t => {
  t.true(hasStructuredSearchParams({
    departmentcode: 'a',
    municipalitycode: 'b',
    oldmunicipalitycode: 'c',
    districtcode: 'd',
    section: 'e',
    sheet: 'f',
    number: 'g',
    foo: 'bar'
  }))

  t.false(hasStructuredSearchParams({q: 'toto'}))
})
