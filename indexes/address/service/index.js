#!/usr/bin/env node
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import morgan from 'morgan'

import logger from '../../../lib/logger.js'

import {createRouter} from './router.js'

const PORT = process.env.ADDRESS_SERVICE_PORT || process.env.PORT || 3001

const server = express()

if (process.env.NODE_ENV !== 'production') {
  server.disable('x-powered-by')
  server.use(morgan('dev'))
}

server.get('/ping', (req, res) => {
  res.send('PONG!')
})

server.use('/', await createRouter())

server.listen(PORT, () => {
  logger.log(`Start listening on port ${PORT}`)
})
