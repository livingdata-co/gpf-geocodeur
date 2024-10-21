import got from 'got'

import {GPF_API_URL} from '../../lib/config.js'

export async function getUserInfo(token) {
  const user = await got(`${GPF_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).json()

  return user
}
