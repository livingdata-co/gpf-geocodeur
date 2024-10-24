import process from 'node:process'

import express from 'express'
import createError from 'http-errors'
import contentDisposition from 'content-disposition'
import bytes from 'bytes'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import w from '../lib/w.js'
import errorHandler from '../lib/error-handler.js'

import {getUserInfo} from './util/gpf.js'

import {initModel} from './model/index.js'
import {validatePipeline} from './pipeline.js'
import {configure as configurePassport} from './passport.js'

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
      try {
        jwt.verify(token, process.env.JWT_SECRET)
      } catch {
        throw createError(401, 'Invalid token')
      }

      return next()
    }

    throw createError('Should not happen but it did')
  })
}

export const handleCommunity = w(async (req, res, next) => {
  const authorizationHeader = req.get('Authorization')
  const communityHeader = req.get('X-Community')

  if (!authorizationHeader && !communityHeader) {
    return next()
  }

  if (!authorizationHeader) {
    throw createError(401, 'Authentication required')
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    throw createError(401, 'Invalid Authorization header')
  }

  const token = authorizationHeader.slice('Bearer '.length)
  let userInfo

  if (process.env.MAGIC_TOKEN) {
    if (token === process.env.MAGIC_TOKEN) {
      req.community = await req.model.upsertCommunity({
        id: 'acme',
        name: 'ACME'
      })

      return next()
    }

    throw createError(401, 'Invalid token')
  }

  try {
    userInfo = await getUserInfo(token)
  } catch {
    throw createError(401, 'Invalid token')
  }

  const community = userInfo.communities_member
    .map(entry => entry.community)
    .find(community => community._id === communityHeader)

  if (!community) {
    throw createError(403, 'User is not a member of this community')
  }

  req.community = await req.model.upsertCommunity({
    id: community._id,
    name: community.name
  })

  next()
})

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

  app.post('/projects', handleCommunity, w(async (req, res) => {
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
