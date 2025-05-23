/* eslint-disable camelcase */
import 'dotenv/config.js'

import process from 'node:process'
import {Blob} from 'node:buffer'

import test from 'ava'
import Papa from 'papaparse'
import iconv from 'iconv-lite'

const {RECETTE_API_URL} = process.env

if (!RECETTE_API_URL) {
  throw new Error('RECETTE_API_URL is required to run this script')
}

function createBlobFromString(string) {
  return new Blob([string], {type: 'text/csv'})
}

function createBlobFromBuffer(buffer) {
  return new Blob([buffer], {type: 'text/csv'})
}

async function executeRequest(options = {}) {
  const operation = options.operation || 'search'

  const formData = new FormData()
  const url = `${RECETTE_API_URL}/${operation}/csv`

  if (options.inputFile) {
    formData.append('data', options.inputFile, options.inputFileName)
  }

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          formData.append(key, v)
        }
      } else {
        formData.append(key, value)
      }
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const responseText = await response.text()

    if (!response.headers.get('content-type').includes('application/json')) {
      const error = new Error(responseText)
      error.code = response.status
      throw error
    }

    const {code, message} = JSON.parse(responseText)
    const error = new Error(message)
    error.code = code
    throw error
  }

  const textValue = await response.text()
  const parseResult = Papa.parse(textValue, {header: true, skipEmptyLines: true})
  return {response, parseResult, textValue}
}

async function executeSingleRequest(operation, item, params) {
  const inputFile = createBlobFromString(Papa.unparse([item]))
  const {parseResult} = await executeRequest({operation, inputFile, params})
  return parseResult.data[0]
}

/* IGNGPF-3989 Support des fichiers CSV jusqu'à 50 Mo et 200 000 lignes */

test('empty request', async t => {
  await t.throwsAsync(() => executeRequest(), {message: 'A CSV file must be provided in data field'})
})

test('CSV 200k rows', async t => {
  // Generate a CSV file with 200 001 rows (200 000 real rows + header)
  const inputFile = createBlobFromString(Papa.unparse(Array.from({length: 200_001}, () => ['a', 'b', 'c'])))
  await t.throwsAsync(
    () => executeRequest({inputFile, params: {columns: ['foo']}}),
    {message: 'At least one given column name is unknown'}
  )
})

test('CSV >200k rows', async t => {
  // Generate a CSV file with 200 002 rows (200 001 real rows + header)
  const inputFile = createBlobFromString(Papa.unparse(Array.from({length: 200_002}, () => ['a', 'b', 'c'])))
  await t.throwsAsync(() => executeRequest({inputFile}), {message: 'Too many rows in CSV file'})
})

test('big file - 10 Mo', async t => {
  t.timeout(2 * 60 * 1000) // 2 minutes - QUALIF 🐌
  const inputFile = createBlobFromBuffer(Buffer.alloc((10 * 1024 * 1024) - 1, 'a'))
  await executeRequest({inputFile})
  t.pass()
})

test('big file - 50 Mo', async t => {
  t.timeout(10 * 60 * 1000) // 10 minutes - QUALIF 🐌
  const inputFile = createBlobFromBuffer(Buffer.alloc((50 * 1024 * 1024) - 1, 'a'))
  await executeRequest({inputFile})
  t.pass()
})

test('big file >50 Mo', async t => {
  t.timeout(10 * 60 * 1000) // 10 minutes - QUALIF 🐌
  const inputFile = createBlobFromBuffer(Buffer.alloc(51 * 1024 * 1024, 'a'))
  await t.throwsAsync(() => executeRequest({inputFile}), {message: 'File too large'})
})

/* IGNGPF-3991 Détection automatique du séparateur de lignes */

test('newline / lf', async t => {
  const inputFile = createBlobFromString('a,b,c\n,,\n,,')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

test('newline / crlf', async t => {
  const inputFile = createBlobFromString('a,b,c\r\n,,\r\n,,')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

/* IGNGPF-3993 Détection automatique du séparateur de colonnes */

test('separator / comma', async t => {
  const inputFile = createBlobFromString('a,b,c\n,,\n,,')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

test('separator / semicolon', async t => {
  const inputFile = createBlobFromString('a;b;c\n;;\n;;')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

test('separator / pipe', async t => {
  const inputFile = createBlobFromString('a|b|c\n||\n||')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

test('separator / tab', async t => {
  const inputFile = createBlobFromString('a\tb\tc\n\t\t\n\t\t')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

/* IGNGPF-3994 Prise en charge du caractère d'échappement */

test('escaping / quotes', async t => {
  const inputFile = createBlobFromString('"a","b","c"\n"","",""\n"","",""')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('c' in parseResult.data[0])
})

/* IGNGPF-3995 Détection automatique de l'encodage des caractères */

test('encoding / utf-8', async t => {
  const inputFile = createBlobFromString('a,b,éléphant\n,,\n,,')
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('éléphant' in parseResult.data[0])
})

test('encoding / latin-1', async t => {
  const inputFile = createBlobFromBuffer(iconv.encode('a,b,éléphant\n,,\n,,', 'latin1'))
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('éléphant' in parseResult.data[0])
})

test('encoding / latin-9', async t => {
  const inputFile = createBlobFromBuffer(iconv.encode('a,b,éléphant€€\n,,\n,,', 'latin9'))
  const {parseResult} = await executeRequest({inputFile})
  t.is(parseResult.data.length, 2)
  t.true('a' in parseResult.data[0])
  t.true('b' in parseResult.data[0])
  t.true('éléphant€€' in parseResult.data[0])
})

/* IGNGPF-3996 Spécification des colonnes pour le géocodage direct */

test('empty data', async t => {
  const result = await executeSingleRequest('search', {numero: '', voie: ''})
  t.is(result.result_status, 'skipped')
})

test('unknown column', async t => {
  await t.throwsAsync(
    () => executeSingleRequest('search', {numero: '', voie: ''}, {columns: ['foo']}),
    {message: 'At least one given column name is unknown'}
  )
})

test('no columns provided', async t => {
  const result = await executeSingleRequest('search', {
    a: 'wwwww',
    b: 'xxxxx',
    numero: '6',
    c: 'yyyyy',
    voie: 'rue de la paix',
    d: 'zzzzz',
    e: 'du bruit par dessus cela',
    commune: 'paris',
    f: 'encore un peu de bruit'
  })
  t.true(result.result_score < '0.5')
})

test('proper columns provided', async t => {
  const result = await executeSingleRequest('search', {
    a: 'wwwww',
    b: 'xxxxx',
    numero: '6',
    c: 'yyyyy',
    voie: 'rue de la paix',
    d: 'zzzzz',
    e: 'du bruit par dessus cela',
    commune: 'paris',
    f: 'encore un peu de bruit'
  }, {columns: ['numero', 'voie', 'commune']})
  t.true(result.result_score > '0.8')
})

/* IGNGPF-3997 Définition des colonnes-filtres "postcode" et "citycode" */

test('postcode provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    code_postal: '10000'
  }, {columns: ['voie']})
  t.true(resultBefore.result_score > '0.8')
  t.false(resultBefore.result_postcode === '10000')

  const resultAfter = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    code_postal: '10000'
  }, {columns: ['voie'], postcode: 'code_postal'})
  t.true(resultAfter.result_score > '0.8')
  t.true(resultAfter.result_postcode === '10000')
})

test('citycode provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    code_insee: '10387'
  }, {columns: ['voie']})
  t.true(resultBefore.result_score > '0.8')
  t.false(resultBefore.result_citycode === '10387')

  const resultAfter = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    code_insee: '10387'
  }, {columns: ['voie'], citycode: 'code_insee'})
  t.true(resultAfter.result_score > '0.5')
  t.true(resultAfter.result_citycode === '10387')
})

test('type provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    numero: '57',
    voie: 'grand rue'
  }, {columns: ['numero', 'voie']})
  t.true(resultBefore.result_score > '0.8')
  t.is(resultBefore.result_type, 'housenumber')

  const resultAfter = await executeSingleRequest('search', {
    numero: '57',
    voie: 'grand rue',
    type: 'street'
  }, {columns: ['numero', 'voie'], type: 'type', citycode: 'code_insee'})
  t.true(resultAfter.result_score > '0.5')
  t.is(resultAfter.result_type, 'street')
})

/* IGNGPF-3998 Détection des colonnes "latitude" et "longitude" */

test('latitude and longitude provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    commune: 'troyes'
  }, {columns: ['voie']})
  t.true(resultBefore.result_score > '0.8')
  t.false(resultBefore.result_citycode === '10387')

  const resultAfter = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    commune: 'troyes',
    latitude: '48.305254',
    lng: '4.066048'
  }, {columns: ['voie']})
  t.true(resultAfter.result_score > '0.8')
  t.true(resultAfter.result_citycode === '10387')
})

/* IGNGPF-3999 Définition des colonnes à retourner dans le résultat */

test('columns to return', async t => {
  const resultBefore = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    commune: 'troyes'
  }, {columns: ['voie', 'commune']})
  t.true(Object.keys(resultBefore).length > 4)

  const resultAfter = await executeSingleRequest('search', {
    voie: 'rue de la paix',
    commune: 'troyes'
  }, {columns: ['voie', 'commune'], result_columns: ['result_score', 'result_id']})
  t.deepEqual(Object.keys(resultAfter), [
    'voie',
    'commune',
    'result_score',
    'result_id'
  ])
})

/* IGNGPF-4000 Métadonnées de géocodage dans les résultats */

test('metadata / result_status / skipped', async t => {
  const result = await executeSingleRequest('search', {numero: '', voie: ''})
  t.is(result.result_status, 'skipped')
})

test('metadata / result_status / ok', async t => {
  const result = await executeSingleRequest('search', {numero: '6', voie: 'rue de la paix', commune: 'paris'})
  t.is(result.result_status, 'ok')
})

test('metadata / result_status / not-found', async t => {
  const result = await executeSingleRequest('search', {numero: '6', voie: 'xxx x x x xxxx x', commune: 'a b c d'})
  t.is(result.result_status, 'not-found')
})

/* IGNGPF-4001 Fichier CSV de sortie avec les caractéristiques du fichier d'entrée */

test('output format / comma + latin1 + crlf => comma + utf8 + crlf', async t => {
  const inputFile = createBlobFromBuffer(iconv.encode('a,b,éléphant\r\n,,', 'latin1'))
  const {textValue, parseResult} = await executeRequest({inputFile})
  t.is(parseResult.meta.delimiter, ',')
  t.is(parseResult.meta.linebreak, '\r\n')
  t.true(textValue.includes('éléphant'))
})

test('output format / semicolon + utf8 + lf=> semicolon + utf8 + lf', async t => {
  const inputFile = createBlobFromString('a;b;éléphant\n;;')
  const {textValue, parseResult} = await executeRequest({inputFile})
  t.is(parseResult.meta.delimiter, ';')
  t.is(parseResult.meta.linebreak, '\n')
  t.true(textValue.includes('éléphant'))
})

/* IGNGPF-4002 Nom du fichier de sortie */

test('output filename / input filename given', async t => {
  const inputFile = createBlobFromString('adresse,b,c\n,,')
  const {response} = await executeRequest({inputFile, inputFileName: 'file.csv'})
  t.is(response.headers.get('content-disposition'), 'attachment; filename="file-geocoded.csv"')
})

/* Reverse */

test('basic reverse', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.121065', latitude: '49.142324'
  })
  t.is(result.result_status, 'ok')
})

test('address - reverse', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['address']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'address')
})

test('poi - reverse', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['poi']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'poi')
})

test('parcel - reverse', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['parcel']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'parcel')
})

test('multiple indexes - reverse', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['address', 'poi']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'address')
})

test('multiple indexes - reverse - poi / parcel', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['poi', 'parcel']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'poi')
})

test('parcel - reverse - result_columns', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['parcel'],
    result_columns: ['result_city', 'result_section', 'result_number']
  })
  t.is(result.result_city, 'Metz')
  t.true('result_section' in result)
  t.true('result_number' in result)
})

test('poi - reverse - result_columns', async t => {
  const result = await executeSingleRequest('reverse', {
    longitude: '6.168371', latitude: '49.101643'
  }, {
    indexes: ['poi'],
    result_columns: ['result_name', 'result_category']
  })
  t.is(result.result_name, 'Pont Amos')
  t.true('result_category' in result)
})

test('multiple indexes - reverse - more', async t => {
  const inputFile = createBlobFromString('longitude,latitude,category\n6.183678,49.118099,\n6.175475,49.119999,clocher\n6.173412,49.099143,')
  const {parseResult} = await executeRequest(
    {
      operation: 'reverse',
      inputFile,
      params: {
        indexes: ['parcel', 'poi', 'address'],
        columns: ['longitude', 'latitude', 'category']
      }
    }
  )

  t.is(parseResult.data.length, 3)
  t.is(parseResult.data[0].result_index, 'address')
  t.is(parseResult.data[1].result_index, 'poi')
  t.is(parseResult.data[2].result_index, 'parcel')
})

/* POI */

test('poi - search', async t => {
  const result = await executeSingleRequest('search', {
    q: 'metz sablon',
    batiment: 'mairie'
  }, {
    indexes: ['poi'],
    columns: ['q']
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_index, 'poi')
})

test('poi - search - category provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    q: 'sablon',
    batiment: 'mairie'
  }, {
    indexes: ['poi'],
    columns: ['q']
  })
  t.is(resultBefore.result_status, 'ok')
  t.is(resultBefore.result_name, 'Cimetière du Sablon')
  const resultAfter = await executeSingleRequest('search', {
    q: 'sablon',
    batiment: 'mairie'
  }, {
    indexes: ['poi'],
    columns: ['q'],
    category: 'batiment'
  })
  t.is(resultAfter.result_status, 'ok')
  t.is(resultAfter.result_name, 'Metz - Mairie de Quartier du Sablon')
})

test('poi - search - citycode provided', async t => {
  const resultBefore = await executeSingleRequest('search', {
    category: 'mairie',
    code_insee: '57463'
  }, {
    indexes: ['poi'],
    columns: ['category']
  })
  t.is(resultBefore.result_status, 'ok')
  t.is(resultBefore.result_name, 'la Mairie')
  const resultAfter = await executeSingleRequest('search', {
    category: 'mairie',
    code_insee: '57463'
  }, {
    indexes: ['poi'],
    columns: ['category'],
    citycode: 'code_insee'
  })
  t.is(resultAfter.result_status, 'ok')
  t.is(resultAfter.result_name, 'Mairie de Metz')
})

test('poi - search - multiple entries', async t => {
  const inputFile = createBlobFromString('numero,voie,city\n4,rue des Robert,Metz\n33, rue Paul Diacre, Metz')
  const {parseResult} = await executeRequest(
    {
      inputFile,
      inputFileName: 'file.csv',
      params: {
        indexes: ['poi']
      }
    }
  )
  t.is(parseResult.data.length, 2)
})

test('multiple indexes - search - multiple entries', async t => {
  const inputFile = createBlobFromString('numero,voie,city,category,lon,lat,section,number,departmentcode,municipalitycode\n4,rue des Robert,Metz,,,,,,,\n,,metz,mairie,6.173588,49.099124,,,,\n,,,,,,SO,115,57,463')
  const {parseResult} = await executeRequest(
    {
      inputFile,
      params: {
        indexes: ['poi', 'address', 'parcel'],
        section: 'section',
        number: 'number',
        departmentcode: 'departmentcode',
        municipalitycode: 'municipalitycode'
      }
    }
  )

  t.is(parseResult.data.length, 3)
  t.is(parseResult.data[0].result_index, 'address')
  t.is(parseResult.data[1].result_index, 'poi')
  t.is(parseResult.data[2].result_index, 'parcel')
})

test('multiple indexes - unknown index', async t => {
  const inputFile = createBlobFromString('numero,voie,city\n4,rue des Robert,Metz')
  await t.throwsAsync(
    () => executeRequest(
      {
        inputFile,
        params: {
          indexes: ['plop', 'address']
        }
      }
    ),
    {message: 'Unsupported index type: plop'}
  )
})

test('parcel - single search', async t => {
  const result = await executeSingleRequest('search', {
    numero_section: 'SO',
    numero_de_parcelle: '115',
    code_departement: '57',
    code_ville: '463'
  }, {
    indexes: ['parcel'],
    section: 'numero_section',
    number: 'numero_de_parcelle',
    departmentcode: 'code_departement',
    municipalitycode: 'code_ville'
  })
  t.is(result.result_status, 'ok')
  t.is(result.result_section, 'SO')
  t.is(result.result_city, 'Metz')
})

test('parcel - multiple entries', async t => {
  const inputFile = createBlobFromString('section,number,departmentcode,municipalitycode\nSO,115,57,463\nST,61,57,463')
  const resultBefore = await executeRequest(
    {
      inputFile,
      params: {
        indexes: ['parcel'],
        section: 'section',
        number: 'number'
      }
    }
  )
  t.is(resultBefore.parseResult.data[0].result_status, 'error')
  t.is(resultBefore.parseResult.data[1].result_status, 'error')
  const resultAfter = await executeRequest(
    {
      inputFile,
      params: {
        indexes: ['parcel'],
        section: 'section',
        number: 'number',
        departmentcode: 'departmentcode',
        municipalitycode: 'municipalitycode'
      }
    }
  )
  t.is(resultAfter.parseResult.data.length, 2)
  t.is(resultAfter.parseResult.data[0].result_status, 'ok')
  t.is(resultAfter.parseResult.data[1].result_status, 'ok')
})

test('parcel - with columns', async t => {
  const result = await executeSingleRequest('search', {
    numero_section: 'SO',
    numero_de_parcelle: '115',
    code_departement: '57',
    code_ville: '463'
  }, {
    indexes: ['parcel'],
    section: 'numero_section',
    number: 'numero_de_parcelle',
    departmentcode: 'code_departement',
    municipalitycode: 'code_ville',
    columns: ['numero_section', 'numero_de_parcelle']
  })
  t.is(result.result_status, 'ok')
})
