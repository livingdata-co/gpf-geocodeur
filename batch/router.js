import express from 'express'
import createError from 'http-errors'
import contentDisposition from 'content-disposition'
import bytes from 'bytes'

import w from '../lib/w.js'

import {initModel} from './model/index.js'
import {validatePipeline} from './pipeline.js'

function ensureProjectToken(model) {
  return w(async (req, res, next) => {
    if (!req.get('Authorization')) {
      throw createError(401, 'Authorization token not provided')
    }

    const token = req.get('Authorization').slice(6)
    const isSameToken = await model.checkProjectToken(req.params.projectId, token)

    if (!isSameToken) {
      throw createError(401, 'Bad token or bad project')
    }

    next()
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

  app.get('/projects', w(async (req, res) => {
    const projects = await model.getProjects()
    res.send(projects)
  }))

  app.post('/projects', w(async (req, res) => {
    const project = await model.createProject()
    res.status(201).send(project)
  }))

  app.get('/projects/:projectId', ensureProjectToken(model), w(async (req, res) => {
    res.send(req.project)
  }))

  app.delete('/projects/:projectId', ensureProjectToken(model), w(async (req, res) => {
    await model.deleteProject(req.params.projectId)
    res.sendStatus(204)
  }))

  app.post('/projects/:projectId/abort', ensureProjectToken(model), w(async (req, res) => {
    await model.abortProcessing(req.params.projectId)
    const project = await model.getProject(req.params.projectId)
    res.send(project)
  }))

  app.put('/projects/:projectId/pipeline', ensureProjectToken(model), express.json(), w(async (req, res) => {
    const pipeline = validatePipeline(req.body)
    await model.setPipeline(req.params.projectId, pipeline)
    const project = await model.getProject(req.params.projectId)
    res.send(project)
  }))

  app.put('/projects/:projectId/input-file', ensureProjectToken(model), w(async (req, res) => {
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

  app.post('/projects/:projectId/start', ensureProjectToken(model), w(async (req, res) => {
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
