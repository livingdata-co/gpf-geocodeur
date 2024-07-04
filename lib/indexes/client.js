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
    async execRequest(operation, body) {
      const response = await got({
        url: `${indexUrl}/${operation}`,
        method: 'POST',
        responseType: 'json',
        throwHttpErrors: false,
        decompress: true,
        agent,
        json: body
      })

      if (!response.ok) {
        throw createHttpError(response.statusCode, response.body)
      }

      return response.body
    }
  }
}
