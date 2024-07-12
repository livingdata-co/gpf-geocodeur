import {Agent as HttpAgent} from 'node:http'
import {Agent as HttpsAgent} from 'node:https'
import createHttpError from 'http-errors'
import got from 'got'

export function createClient({indexUrl}) {
  const agent = {
    http: new HttpAgent({keepAlive: true, keepAliveMsecs: 1000}),
    https: new HttpsAgent({keepAlive: true, keepAliveMsecs: 1000})
  }

  return {
    async execRequest(operation, body, options = {}) {
      const gotOptions = {
        url: `${indexUrl}/${operation}`,
        method: 'POST',
        responseType: 'json',
        throwHttpErrors: false,
        decompress: true,
        agent,
        json: body
      }

      if (options.signal) {
        gotOptions.signal = options.signal
      }

      const response = await got(gotOptions)

      if (!response.ok) {
        throw createHttpError(response.statusCode, response.body)
      }

      return response.body
    }
  }
}
