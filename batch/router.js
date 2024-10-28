import process from 'node:process'

import express from 'express'
import createError from 'http-errors'
import contentDisposition from 'content-disposition'
import bytes from 'bytes'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import w from '../lib/w.js'
import errorHandler from '../lib/error-handler.js'

import {initModel} from './model/index.js'
import {validatePipeline} from './pipeline.js'
import {configure as configurePassport} from './passport.js'
import {handleToken, authorize} from './auth.js'

export default async function createRouter() {
  const app = new express.Router()

  const model = await initModel()

  const usePassport = Boolean(process.env.GPF_AUTHORIZATION_URL)

  if (usePassport) {
    configurePassport()
  }

  app.param('projectId', w(async (req, res, next) => {
    const project = await model.getProject(req.params.projectId)

    if (!project) {
      throw createError(404, 'Project not found')
    }

    req.project = project
    next()
  }))

  app.param('communityId', w(async (req, res, next) => {
    const community = await model.getCommunity(req.params.communityId)

    if (!community) {
      throw createError(404, 'Community not found')
    }

    req.community = community
    next()
  }))

  // Inject model
  app.use((req, res, next) => {
    req.model = model
    next()
  })

  app.get('/auth/gpf', w(async (req, res) => {
    if (process.env.MAGIC_TOKEN) {
      const redirectUrl = new URL(process.env.SUPERVISION_APP_URL)

      const token = jwt.sign(req.user, process.env.JWT_SECRET, {expiresIn: '12h'})
      redirectUrl.searchParams.set('token', token)

      return res.redirect(redirectUrl.toString())
    }

    if (usePassport) {
      return passport.authenticate('gpf', {session: false})(req, res)
    }

    res.sendStatus(501)
  }))

  if (usePassport) {
    app.get('/auth/gpf/callback', passport.authenticate('gpf', {session: false}), (req, res) => {
      const redirectUrl = new URL(process.env.SUPERVISION_APP_URL)

      if (req.user.isAdmin) {
        const token = jwt.sign(req.user, process.env.JWT_SECRET, {expiresIn: '12h'})
        redirectUrl.searchParams.set('token', token)
      } else {
        redirectUrl.searchParams.set('error', 'missing_role')
      }

      res.redirect(redirectUrl.toString())
    })
  }

  app.get('/projects', authorize(['admin'], model), w(async (req, res) => {
    const projects = await model.getProjects()
    res.send(projects)
  }))

  app.post('/projects', handleToken, w(async (req, res) => {
    const project = await model.createProject({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      community: req.community
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

    const {params} = req.project

    if (params.maxInputFileSize && fileSize > bytes(params.maxInputFileSize)) {
      throw createError(403, `File too large. Maximum allowed: ${params.maxInputFileSize}`)
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

  app.get('/projects/:projectId/input-file/:token', w(async (req, res) => {
    if (!req.project.inputFile || req.project.inputFile.token !== req.params.token) {
      throw createError(403, 'Unable to access to this file')
    }

    const inputFileStream = await model.getInputFileDownloadStream(req.params.projectId)

    res.set('Content-Disposition', contentDisposition(req.project.inputFile.name))
    res.set('Content-Length', req.project.inputFile.size)
    res.set('Content-Type', 'application/octet-stream')
    inputFileStream.pipe(res)
  }))

  app.get('/projects/:projectId/output-file/:token', w(async (req, res) => {
    if (!req.project.outputFile || req.project.outputFile.token !== req.params.token) {
      throw createError(403, 'Unable to access to this file')
    }

    const outputFileStream = await model.getOutputFileDownloadStream(req.params.projectId)

    res.set('Content-Disposition', contentDisposition(req.project.outputFile.name))
    res.set('Content-Length', req.project.outputFile.size)
    res.set('Content-Type', 'application/octet-stream')
    outputFileStream.pipe(res)
  }))

  app.get('/communities', authorize(['admin']), w(async (req, res) => {
    const communities = await model.getCommunities()
    res.send(communities)
  }))

  app.put('/communities/:communityId/params', authorize(['admin']), express.json(), w(async (req, res) => {
    await model.updateCommunityParams(req.community.id, req.body)
    const community = await model.getCommunity(req.community.id)
    res.send(community)
  }))

  app.delete('/communities/:communityId', authorize(['admin']), w(async (req, res) => {
    await model.deleteCommunity(req.community.id)
    res.sendStatus(204)
  }))

  app.use(errorHandler)

  return app
}
