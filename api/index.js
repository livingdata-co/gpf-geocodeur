#!/usr/bin/env node
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import logger from '../lib/logger.js'

import createRouter from './router.js'
import createAsyncRouter from '../batch/router.js'

const PORT = process.env.API_PORT || process.env.PORT || 3000

const app = express()

app.disable('x-powered-by')

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

if (process.env.CORS_DISABLE !== '1') {
  app.use(cors({origin: true}))
}

app.get('/ping', (req, res) => {
  res.send('PONG!')
})

app.use('/', await createRouter())
app.use('/async', await createAsyncRouter())

app.listen(PORT, () => {
  logger.log(`Start listening on port ${PORT}`)
})
