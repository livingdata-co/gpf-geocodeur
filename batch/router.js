import process from 'node:process'

import express from 'express'
import createError from 'http-errors'
import contentDisposition from 'content-disposition'
import bytes from 'bytes'

import w from '../lib/w.js'

import {initModel} from './model/index.js'
import {validatePipeline} from './pipeline.js'

function getAuthStrategyFromTokenType(tokenType) {
  if (tokenType === 'Bearer') {
    return 'admin'
  }

  if (tokenType === 'Token') {
    return 'project'
  }

  throw createError(401, 'Invalid token type')
}

function authorize(strategies) {
  return w(async (req, res, next) => {
    if (!req.get('Authorization')) {
      throw createError(401, 'Authentication required')
    }

    const [tokenType, token] = req.get('Authorization').split(' ')

    if (!tokenType || !token) {
      throw createError(401, 'Invalid Authorization header')
    }

    const strategy = getAuthStrategyFromTokenType(tokenType)

    if (!strategies.includes(strategy)) {
      throw createError(401, 'Invalid token type')
    }

    if (strategy === 'project') {
      const isValidToken = await req.model.checkProjectToken(req.params.projectId, token)
      if (!isValidToken) {
        throw createError(401, 'Invalid token')
      }

      return next()
    }

    if (strategy === 'admin') {
      if (!process.env.MAGIC_TOKEN) {
        throw createError(501, 'Authentication strategy not available')
      }

      if (token !== process.env.MAGIC_TOKEN) {
        throw createError(401, 'Invalid token')
      }

      return next()
    }

    throw createError('Should not happen but it did')
  })
}

export default async function createRouter() {
  const app = new express.Router()

  const model = await initModel()

  app.param('projectId', w(async (req, res, next) => {
    const project = await model.getProject(req.params.projectId)

    if (!project) {
      throw createError(404, 'Project not found')
    }

    req.project = project
    next()
  }))

  // Inject model
  app.use((req, res, next) => {
    req.model = model
    next()
  })

  app.get('/auth/gpf', w(async (req, res) => {
    if (!process.env.MAGIC_TOKEN) {
      return res.sendStatus(501)
    }

    if (!req.query.redirectUrl) {
      throw createError(400, 'redirectUrl query parameter is required')
    }

    const redirectUrl = new URL(req.query.redirectUrl)
    redirectUrl.searchParams.set('token', process.env.MAGIC_TOKEN)

    res.redirect(redirectUrl.toString())
  }))

  app.get('/projects', authorize(['admin'], model), w(async (req, res) => {
    const projects = await model.getProjects()
    res.send(projects)
  }))

  app.post('/projects', w(async (req, res) => {
    const project = await model.createProject({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      community: null
    })
    res.status(201).send(project)
  }))

  app.get('/projects/:projectId', authorize(['project', 'admin']), w(async (req, res) => {
    res.send(req.project)
  }))

  app.delete('/projects/:projectId', authorize(['project', 'admin']), w(async (req, res) => {
    await model.deleteProject(req.params.projectId)
    res.sendStatus(204)
  }))

  app.post('/projects/:projectId/abort', authorize(['project', 'admin']), w(async (req, res) => {
    await model.abortProcessing(req.params.projectId)
    const project = await model.getProject(req.params.projectId)
    res.send(project)
  }))

  app.put('/projects/:projectId/pipeline', authorize(['project']), express.json(), w(async (req, res) => {
    const pipeline = validatePipeline(req.body)
    await model.setPipeline(req.params.projectId, pipeline)
    const project = await model.getProject(req.params.projectId)
    res.send(project)
  }))

  app.put('/projects/:projectId/input-file', authorize(['project']), w(async (req, res) => {
    if (!req.get('Content-Disposition') || !req.get('Content-Disposition').includes('filename')) {
      throw createError(400, 'Filename must be provided through Content-Disposition')
    }

    if (!req.get('Content-Length')) {
      throw createError(400, 'File size must be provided through Content-Length')
    }

    const {parameters: {filename}} = contentDisposition.parse(req.get('Content-Disposition'))
    const fileSize = Number.parseInt(req.get('Content-Length'), 10)

    const {userParams} = req.project

    if (userParams.maxFileSize && fileSize > bytes(userParams.maxFileSize)) {
      throw createError(403, `File too large. Maximum allowed: ${userParams.maxFileSize}`)
    }

    await model.setInputFile(req.params.projectId, {name: filename, size: fileSize}, req)
    const project = await model.getProject(req.params.projectId)
    res.send(project)
  }))

  app.post('/projects/:projectId/start', authorize(['project']), w(async (req, res) => {
    await model.askProcessing(req.params.projectId)
    const project = await model.getProject(req.params.projectId)
    res.status(202).send(project)
  }))

  app.get('/projects/:projectId/output-file/:token', w(async (req, res) => {
    if (!req.project.outputFile || req.project.outputFile.token !== req.params.token) {
      throw createError(403, 'Unable to access to this file')
    }

    const outputFileStream = await model.getOutputFileDownloadStream(req.params.projectId)

    res.set('Content-Disposition', contentDisposition(req.project.outputFile.filename))
    res.set('Content-Length', req.project.outputFile.size)
    res.set('Content-Type', 'application/octet-stream')
    outputFileStream.pipe(res)
  }))

  return app
}
