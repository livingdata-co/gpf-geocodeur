import process from 'node:process'

import logger from './logger.js'

export default function errorHandler(err, req, res, _next) {
  if (err) {
    const statusCode = err.statusCode || 500
    const exposeError = statusCode !== 500

    res
      .status(statusCode)
      .send({
        code: statusCode,
        message: exposeError ? err.message : 'An unexpected error has occurred',
        detail: err.detail
      })

    if (statusCode === 500 && process.env.NODE_ENV !== 'test' && err.message !== 'Aborted') {
      logger.error(err)
    }
  }
}
