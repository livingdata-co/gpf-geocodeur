/* eslint-disable no-await-in-loop, ava/no-skip-test */
import 'dotenv/config.js'

import process from 'node:process'
import {setTimeout} from 'node:timers/promises'

import test from 'ava'
import got from 'got'
import Papa from 'papaparse'

const {RECETTE_API_URL, RECETTE_ADMIN_TOKEN, RECETTE_USER_TOKEN, RECETTE_COMMUNITY_ID, RECETTE_KEEP_PROJECTS} = process.env

if (!RECETTE_API_URL) {
  throw new Error('RECETTE_API_URL is required to run this script')
}

test.afterEach.always(async t => {
  if (t.context.id && t.context.token && RECETTE_KEEP_PROJECTS !== '1') {
    try {
      await abortProcessing(t.context.id, t.context.token)
    } catch {
      // Ignore error
    }

    try {
      await deleteProject(t.context.id, t.context.token)
    } catch {
      // Ignore error
    }
  }
})

test('search / address only', async t => {
  const file = Buffer.from('localisant,foo\nMetz,bar\nWoippy,baz\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)
  t.is(project.status, 'completed')
  t.is(project.outputFile.data.length, 2)
  t.true(project.outputFile.data.every(row => row.result_index === 'address'))
})

test('search / invalid token', async t => {
  const {id} = await createProject(t)
  await t.throwsAsync(() => getProject(id, 'invalid-token'), {message: 'Invalid token'})
})

test('search / address only / geojson', async t => {
  const file = Buffer.from('localisant,foo\nMetz,bar\nWoippy,baz\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'geojson',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)
  t.is(project.status, 'completed')
  t.is(project.outputFile.data.features.length, 2)
  t.true(project.outputFile.data.features.every(f => f.properties.result_index === 'address'))
})

test('search / poi only', async t => {
  const file = Buffer.from('localisant,foo\nGare de Metz,bar\nHôpital de Mercy,baz\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['poi'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const {status, outputFile} = await executeRequest(t, file, pipeline)
  t.is(status, 'completed')
  t.is(outputFile.data.length, 2)
  t.true(outputFile.data.every(row => row.result_index === 'poi'))
})

test('search / file too big', async t => {
  const file = Buffer.alloc(51 * 1024 * 1024) // 51MB
  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  await t.throwsAsync(() => executeRequest(t, file, pipeline), {message: 'File too large. Maximum allowed: 50MB'})
})

test('search / invalid outputFormat', async t => {
  const file = Buffer.alloc(1024 * 1024)
  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'shp',
    outputFormatOptions: {}
  }

  await t.throwsAsync(() => executeRequest(t, file, pipeline), {message: 'Output format not supported: shp'})
})

test('search / unknown column', async t => {
  const file = Buffer.from('localisant,foo\nMetz,bar\nWoippy,baz\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'foo',
      indexes: ['address'],
      columns: ['baz']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)
  t.is(project.status, 'failed')
  t.is(project.processing.globalError, 'At least one given column name is unknown')
})

test('search / malformed csv', async t => {
  const file = Buffer.from('localisant,foo\nMetz,bar,alpha\nWoippy,baz\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'foo',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)

  t.is(project.status, 'failed')
  t.is(project.processing.step, 'validating')
  t.is(project.processing.validationError, 'Error in CSV file: TooManyFields')
  t.is(project.processing.globalError, 'Validation failed')
})

test('reverse / address only', async t => {
  const file = Buffer.from('latitude,longitude\n49.119308,6.175715\n49.119308,6.175715\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'reverse',
      indexes: ['address']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)
  t.is(project.status, 'completed')
  t.is(project.outputFile.data.length, 2)
  t.true(project.outputFile.data.every(row => row.result_index === 'address'))
})

test('reverse / parcel only', async t => {
  const file = Buffer.from('latitude,longitude\n49.119308,6.175715\n49.119308,6.175715\n')
  const pipeline = {
    geocodeOptions: {
      operation: 'reverse',
      indexes: ['parcel']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const project = await executeRequest(t, file, pipeline)
  t.is(project.status, 'completed')
  t.is(project.outputFile.data.length, 2)
  t.true(project.outputFile.data.every(row => row.result_index === 'parcel'))
})

test('search / abort processing', async t => {
  const header = 'localisant,foo\n'
  const row = 'Metz,bar\n'
  // Now we build a huge file with header (1 time) + row (100000 times)
  const file = Buffer.concat([
    Buffer.from(header),
    ...Array.from({length: 100_000}, () => Buffer.from(row))
  ])

  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  const startedProject = await executeRequest(t, file, pipeline, {noWait: true})
  t.true(['processing', 'waiting'].includes(startedProject.status))

  const abortedProject = await abortProcessing(startedProject.id, startedProject.token)
  t.is(abortedProject.status, 'idle')
})

test('search / abort processing / forbidden', async t => {
  const {id, token} = await createProject(t)
  await t.throwsAsync(() => abortProcessing(id, token), {
    message: 'This action requires the following statuses: processing, waiting. Actual status: idle'
  })
})

test('search / delete project', async t => {
  const {id, token} = await createProject(t)
  await deleteProject(id, token)
  await t.throwsAsync(() => getProject(id, token), {message: 'Project not found'})
})

test('search / delete project / forbidden', async t => {
  const {id, token} = await createProject(t)

  const header = 'localisant,foo\n'
  const row = 'Metz,bar\n'
  // Now we build a huge file with header (1 time) + row (100000 times)
  const file = Buffer.concat([
    Buffer.from(header),
    ...Array.from({length: 100_000}, () => Buffer.from(row))
  ])

  const pipeline = {
    geocodeOptions: {
      operation: 'search',
      indexes: ['address'],
      columns: ['localisant']
    },
    outputFormat: 'csv',
    outputFormatOptions: {}
  }

  await setPipeline(id, token, pipeline)
  await setInputFile(id, token, file)

  await startProcessing(id, token)

  const error = await t.throwsAsync(() => deleteProject(id, token))
  t.true(error.message.startsWith('This action requires the following statuses: idle, completed, failed. Actual status:'))
})

authenticatedTest('create project / authentication / success', async t => {
  const project = await createProject(t, RECETTE_USER_TOKEN)
  t.deepEqual(project.params, {maxInputFileSize: '50MB', concurrency: 1})
  t.truthy(project.email)
})

authenticatedTest('create project / authentication / failure', async t => {
  await t.throwsAsync(() => createProject(t, 'invalid-token'), {message: 'Invalid token'})
})

authenticatedTest('create project / community / success', async t => {
  const project = await createProject(t, RECETTE_USER_TOKEN, RECETTE_COMMUNITY_ID)
  t.deepEqual(project.params, {maxInputFileSize: '1GB', concurrency: 4})
  t.truthy(project.email)
})

authenticatedTest('create project / community / failure', async t => {
  await t.throwsAsync(() => createProject(t, RECETTE_USER_TOKEN, 'invalid-community-id'), {message: 'User is not a member of this community'})
})

adminTest('list projects', async t => {
  const {id} = await createProject(t)

  const projects = await getProjectsAsAdmin()
  t.true(projects.length > 1)
  t.true(projects.some(p => p.id === id))
})

adminTest('list communities', async t => {
  const communities = await getCommunitiesAsAdmin()
  t.true(communities.length === 1)
})

/* Test helpers */

function authenticatedTest(title, implementation) {
  if (RECETTE_USER_TOKEN && RECETTE_COMMUNITY_ID) {
    test(title, implementation)
  } else {
    test.skip(title, implementation)
  }
}

function adminTest(title, implementation) {
  if (RECETTE_ADMIN_TOKEN) {
    test(title, implementation)
  } else {
    test.skip(title, implementation)
  }
}

/* API helpers */

async function executeRequest(t, inputFile, pipeline, options = {}) {
  try {
    const processingMaxDuration = options.processingMaxDuration || 2000

    const {id, token} = await createProject(t)

    await setInputFile(id, token, inputFile, {fileName: 'foo.csv', fileSize: inputFile.length})
    await setPipeline(id, token, pipeline)

    const startedProject = await startProcessing(id, token)

    const startedAt = Date.now()
    let project

    if (options.noWait) {
      return {...startedProject, token}
    }

    do {
      await setTimeout(200)

      project = await getProject(id, token)
    } while (
      ['waiting', 'processing'].includes(project.status)
      && Date.now() - startedAt < processingMaxDuration
    )

    if (project.outputFile) {
      const {token: outputFileToken} = project.outputFile
      const outputFile = await getOutputFile(id, outputFileToken)

      project.outputFile.data = project.pipeline.outputFormat === 'csv'
        ? Papa.parse(outputFile, {header: true, skipEmptyLines: true}).data
        : JSON.parse(outputFile)
    }

    return project
  } catch (error) {
    if (error.response) {
      // Parse error message
      const {code, message} = JSON.parse(error.response.body)
      const newError = new Error(message)
      newError.code = code
      throw newError
    }

    throw error
  }
}

async function handleError(gotRequest) {
  try {
    return await gotRequest
  } catch (error) {
    if (error.response) {
      // Parse error message
      const {code, message} = JSON.parse(error.response.body)
      const newError = new Error(message)
      newError.code = code
      throw newError
    }

    throw error
  }
}

async function createProject(t, token, communityId) {
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (communityId) {
    headers['X-Community'] = communityId
  }

  const project = await handleError(
    got.post(`${RECETTE_API_URL}/async/projects`, {headers}).json()
  )

  t.context.id = project.id
  t.context.token = project.token

  return project
}

async function deleteProject(id, token) {
  return handleError(
    got.delete(`${RECETTE_API_URL}/async/projects/${id}`, {
      headers: {
        Authorization: `Token ${token}`
      }
    })
  )
}

async function abortProcessing(id, token) {
  return handleError(
    got.post(`${RECETTE_API_URL}/async/projects/${id}/abort`, {
      headers: {
        Authorization: `Token ${token}`
      }
    }).json()
  )
}

async function getProject(id, token) {
  return handleError(
    got.get(`${RECETTE_API_URL}/async/projects/${id}`, {
      headers: {
        Authorization: `Token ${token}`
      }
    }).json()
  )
}

async function setInputFile(id, token, inputFile, {fileName, fileSize} = {}) {
  const headers = {Authorization: `Token ${token}`}

  if (fileName) {
    headers['Content-Disposition'] = `attachment; filename=${fileName}`
  }

  return handleError(
    got.put(`${RECETTE_API_URL}/async/projects/${id}/input-file`, {
      body: inputFile,
      headers,
      hooks: {
        // Hook to prevent Got from setting Content-Length header automatically
        beforeRequest: [
          options => {
            if (fileSize) {
              options.headers['content-length'] = fileSize
            } else {
              delete options.headers['content-length']
            }
          }
        ]
      }
    }).json()
  )
}

async function setPipeline(id, token, pipeline) {
  return handleError(
    got.put(`${RECETTE_API_URL}/async/projects/${id}/pipeline`, {
      json: pipeline,
      headers: {
        Authorization: `Token ${token}`
      }
    }).json()
  )
}

async function startProcessing(id, token) {
  return handleError(
    got.post(`${RECETTE_API_URL}/async/projects/${id}/start`, {
      headers: {
        Authorization: `Token ${token}`
      }
    }).json()
  )
}

async function getOutputFile(id, outputFileToken) {
  return handleError(
    got.get(`${RECETTE_API_URL}/async/projects/${id}/output-file/${outputFileToken}`).text()
  )
}

async function getProjectsAsAdmin() {
  return handleError(
    got.get(`${RECETTE_API_URL}/async/projects`, {
      headers: {
        Authorization: `Bearer ${RECETTE_ADMIN_TOKEN}`
      }
    }).json()
  )
}

async function getCommunitiesAsAdmin() {
  return handleError(
    got.get(`${RECETTE_API_URL}/async/communities`, {
      headers: {
        Authorization: `Bearer ${RECETTE_ADMIN_TOKEN}`
      }
    }).json()
  )
}
