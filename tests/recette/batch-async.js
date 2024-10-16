/* eslint-disable no-await-in-loop */
import 'dotenv/config.js'

import process from 'node:process'
import {setTimeout} from 'node:timers/promises'

import test from 'ava'
import got from 'got'
import Papa from 'papaparse'

const {RECETTE_API_URL} = process.env

if (!RECETTE_API_URL) {
  throw new Error('RECETTE_API_URL is required to run this script')
}

async function executeRequest(inputFile, inputFileName, pipeline, options = {}) {
  const processingMaxDuration = options.processingMaxDuration || 2000

  const {id, token} = await got.post(`${RECETTE_API_URL}/async/projects`).json()

  await got.put(`${RECETTE_API_URL}/async/projects/${id}/input-file`, {
    body: inputFile,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Disposition': `attachment; filename="${inputFileName}"`
    }
  })

  await got.put(`${RECETTE_API_URL}/async/projects/${id}/pipeline`, {
    json: pipeline,
    headers: {
      Authorization: `Token ${token}`
    }
  })

  await got.post(`${RECETTE_API_URL}/async/projects/${id}/start`, {
    headers: {
      Authorization: `Token ${token}`
    }
  })

  const startedAt = Date.now()
  let project

  do {
    await setTimeout(200)

    project = await got.get(`${RECETTE_API_URL}/async/projects/${id}`, {
      headers: {
        Authorization: `Token ${token}`
      }
    }).json()
  } while (
    ['waiting', 'processing'].includes(project.status)
    && Date.now() - startedAt < processingMaxDuration
  )

  if (project.outputFile) {
    const {token: outputFileToken} = project.outputFile
    const outputFile = await got.get(`${RECETTE_API_URL}/async/projects/${id}/output-file/${outputFileToken}`).text()

    project.outputFile.data = project.pipeline.outputFormat === 'csv'
      ? Papa.parse(outputFile, {header: true, skipEmptyLines: true}).data
      : JSON.parse(outputFile)
  }

  return project
}

test('Opération search sur l’index address seul', async t => {
  const file = Buffer.from('localisant,foo\nMetz,bar\nWoippy,baz\n')
  const pipeline = {
    format: 'csv',
    formatOptions: {delimiter: ','},
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const {status, outputFile} = await executeRequest(file, 'foo.csv', pipeline)
  t.is(status, 'completed')
  t.is(outputFile.data.length, 2)
  t.true(outputFile.data.every(row => row.result_index === 'address'))
})

test('Opération search sur l’index poi seul', async t => {
  const file = Buffer.from('localisant,foo\nGare de Metz,bar\nHôpital de Mercy,baz\n')
  const pipeline = {
    format: 'csv',
    formatOptions: {delimiter: ','},
    geocodeOptions: {
      operation: 'search',
      indexes: ['poi'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const {status, outputFile} = await executeRequest(file, 'poi.csv', pipeline)
  t.is(status, 'completed')
  t.is(outputFile.data.length, 2)
  t.true(outputFile.data.every(row => row.result_index === 'poi'))
})
