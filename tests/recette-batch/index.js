/* eslint-disable camelcase */
import 'dotenv/config.js'

import process from 'node:process'
import {Blob} from 'node:buffer' // eslint-disable-line n/no-unsupported-features/node-builtins

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
  await t.throwsAsync(() => executeRequest({inputFile}), {message: 'Errors in CSV file: UndetectableDelimiter'})
})

test('big file - 50 Mo', async t => {
  t.timeout(10 * 60 * 1000) // 10 minutes - QUALIF 🐌
  const inputFile = createBlobFromBuffer(Buffer.alloc((50 * 1024 * 1024) - 1, 'a'))
  await t.throwsAsync(() => executeRequest({inputFile}), {message: 'Errors in CSV file: UndetectableDelimiter'})
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

test('separator / undetectable', async t => {
  const inputFile = createBlobFromString('invalid csv file')
  await t.throwsAsync(() => executeRequest({inputFile}), {message: 'Errors in CSV file: UndetectableDelimiter'})
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
