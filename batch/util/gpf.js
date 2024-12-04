import got from 'got'
import {HttpProxyAgent, HttpsProxyAgent} from 'hpagent'

import {GPF_API_URL, HTTP_PROXY, HTTPS_PROXY} from '../../lib/config.js'

function getAgent() {
  const agent = {}

  if (HTTP_PROXY) {
    agent.http = new HttpProxyAgent({
      proxy: HTTP_PROXY
    })
  }

  if (HTTPS_PROXY) {
    agent.https = new HttpsProxyAgent({
      proxy: HTTPS_PROXY
    })
  }

  return agent
}

const agent = getAgent()

export async function getUserInfo(token) {
  const user = await got(`${GPF_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    agent
  }).json()

  return user
}

export function readTokenData(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
}
