import {PassThrough} from 'node:stream'
import test from 'ava'
import Redis from 'ioredis-mock'
import {
  createProject,
  checkProjectToken,
  getProject,
  deleteProject,
  endProcessing,
  getStalledProjects,
  ensureProjectStatus,
  setPipeline,
  setInputFile,
  setOutputFile
} from '../project.js'

/**
 * Setup Redis client mock before each test
 */
test.beforeEach(t => {
  t.context.redis = new Redis()
  t.context.redis.flushall()

  t.context.storage = {
    async deleteFile() {},
    async uploadFile() {
      return 'foo'
    }
  }
})

/**
 * Test de la fonction createProject
 */
test.serial('createProject should create a new project and store it in Redis', async t => {
  const {redis} = t.context

  const project = await createProject({}, {redis})

  const storedProject = await redis.hgetall(`project:${project.id}:meta`)

  t.truthy(project.id)
  t.truthy(project.token)
  t.is(storedProject.status, 'idle')
})

/**
 * Test de la fonction checkProjectToken
 */
test.serial('checkProjectToken should return true if the token matches the project ID', async t => {
  const {redis} = t.context
  const projectId = '123'
  const token = 'abc'

  await redis.set(`token:${token}`, projectId)

  const result = await checkProjectToken(projectId, token, {redis})

  t.is(result, true)
})

test('checkProjectToken should return false if the token or id is not provided', async t => {
  const {redis} = t.context
  t.is(await checkProjectToken('123', null, {redis}), false)
  t.is(await checkProjectToken(null, 'abc', {redis}), false)
})

test.serial('checkProjectToken should return false if the token does not match the project ID', async t => {
  const {redis} = t.context
  const projectId = '123'
  const token = 'abc'

  const result = await checkProjectToken(projectId, token, {redis})

  t.is(result, false)
})

test.serial('ensureProjectStatus should throw an error if the project status does not match the expected status', async t => {
  const {redis} = t.context
  const projectId = '123'
  await redis.hmset(`project:${projectId}:meta`, {status: 'processing'})

  const error = await t.throwsAsync(() => ensureProjectStatus(projectId, 'idle', {redis}))
  t.is(error.message, 'This action requires the following statuses: idle. Actual status: processing')
})

/**
 * Test de la fonction getProject
 */
test.serial('getProject should retrieve a project and processing data from Redis', async t => {
  const {redis} = t.context
  const projectId = '123'
  const metadata = {
    id: '123',
    status: 'processing'
  }
  const processingData = {
    step: 'started'
  }

  await redis.hmset(`project:${projectId}:meta`, metadata)
  await redis.hmset(`project:${projectId}:processing`, processingData)

  const result = await getProject(projectId, {redis})

  t.deepEqual(result, {
    id: '123',
    status: 'processing',
    processing: {
      step: 'started'
    }
  })
})

/**
 * Test de la fonction deleteProject
 */
test.serial('deleteProject should remove project data from Redis and delete files from storage', async t => {
  const {redis, storage} = t.context
  const projectId = '123'
  const inputFile = 'input-file-key'
  const outputFile = 'output-file-key'

  const metadata = {
    id: '123',
    status: 'completed'
  }
  const processingData = {
    step: 'finished'
  }

  await redis.hmset(`project:${projectId}:meta`, metadata)
  await redis.hmset(`project:${projectId}:processing`, processingData)

  await redis.set(`project:${projectId}:input-obj-key`, inputFile)
  await redis.set(`project:${projectId}:output-obj-key`, outputFile)

  let deleted = 0

  storage.deleteFile = async key => {
    if (key === outputFile || key === inputFile) {
      deleted++
    }
  }

  await deleteProject(projectId, {redis, storage})

  const projectExists = await redis.exists(`project:${projectId}:meta`)
  t.is(projectExists, 0)
  t.is(deleted, 2)
})

/**
 * Test de la fonction endProcessing
 */
test.serial('endProcessing should update project status to completed or failed', async t => {
  const {redis} = t.context
  const projectId = '123'
  const error = null

  const metadata = {
    id: '123',
    status: 'processing'
  }

  await redis.sadd('processing-list', projectId)
  await redis.hmset(`project:${projectId}:meta`, metadata)
  await redis.hmset(`project:${projectId}:processing`, {step: 'processing'})

  await endProcessing(projectId, error, {redis})

  const updatedProject = await redis.hgetall(`project:${projectId}:processing`)
  t.is(updatedProject.step, 'completed')

  // On vérifie que le projet a bien été retiré de la liste des projets en cours
  const processingList = await redis.smembers('processing-list')
  t.deepEqual(processingList, [])
})

/**
 * Test de la fonction getStalledProjects
 */
test.serial('getStalledProjects should return projects with a stalled heartbeat', async t => {
  const {redis} = t.context
  const projectId = '123'

  await redis.sadd('processing-list', projectId)
  await redis.hset(`project:${projectId}:processing`, 'heartbeat', '2024-10-12T12:00:00.000Z')

  const result = await getStalledProjects({redis})

  t.deepEqual(result, [projectId])
})

/**
 * Test de la fonction setPipeline
 */
test.serial('setPipeline should store pipeline data in Redis', async t => {
  const {redis} = t.context
  const projectId = '123'
  const pipelineData = {step: 'initialization', completed: false}

  const metadata = {
    id: '123',
    status: 'idle'
  }

  await redis.sadd('processing-list', projectId)
  await redis.hmset(`project:${projectId}:meta`, metadata)

  await setPipeline(projectId, pipelineData, {redis})

  const storedPipeline = await redis.hgetall(`project:${projectId}:meta`)

  t.is(storedPipeline.pipeline, JSON.stringify(pipelineData))
})

/**
 * Test de la fonction setInputFile
 */
test.serial('setInputFile should store input file metadata in Redis', async t => {
  const {redis} = t.context
  const projectId = '123'
  const inputFileData = {name: 'data.csv', size: 5000}

  const metadata = {
    id: projectId,
    status: 'idle'
  }

  await redis.hmset(`project:${projectId}:meta`, metadata)

  const dataStream = new PassThrough()
  dataStream.write('file content here')
  dataStream.end()

  const storage = {
    async uploadFile() {
      return 'foo'
    }
  }

  await setInputFile(projectId, inputFileData, dataStream, {redis, storage})

  const {inputFile} = await redis.hgetall(`project:${projectId}:meta`)
  t.deepEqual(Object.keys(JSON.parse(inputFile)).sort(), ['name', 'size', 'token'])

  t.is(await redis.get(`project:${projectId}:input-obj-key`), 'foo')
})

/**
 * Test de la fonction setOutputFile
 */
test.serial('setOutputFile should store output file metadata in Redis', async t => {
  const {redis} = t.context
  const projectId = '123'
  const outputFileData = {name: 'results.json', size: 8000}

  const metadata = {
    id: projectId,
    status: 'processing'
  }

  await redis.hmset(`project:${projectId}:meta`, metadata)

  const dataStream = new PassThrough()
  dataStream.write('file content here')
  dataStream.end()

  const storage = {
    async uploadFile() {
      return 'bar'
    },
    async getFileSize() {
      return 8000
    }
  }

  await setOutputFile(projectId, outputFileData.name, dataStream, {redis, storage})

  const meta = await redis.hgetall(`project:${projectId}:meta`)
  const outputFile = JSON.parse(meta.outputFile)

  t.is(outputFile.name, 'results.json')
  t.is(outputFile.size, 8000)
  t.truthy(outputFile.token)
  t.is(await redis.get(`project:${projectId}:output-obj-key`), 'bar')
})
