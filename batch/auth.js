import process from 'node:process'

import createError from 'http-errors'
import jwt from 'jsonwebtoken'

import w from '../lib/w.js'

import {getUserInfo, readTokenData} from './util/gpf.js'

export function getAuthStrategyFromTokenType(tokenType) {
  if (tokenType === 'Bearer') {
    return 'admin'
  }

  if (tokenType === 'Token') {
    return 'project'
  }

  throw createError(401, 'Invalid token type')
}

export function authorize(strategies) {
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
        if (process.env.MAGIC_TOKEN && token !== process.env.MAGIC_TOKEN) {
          throw createError(401, 'Invalid token')
        }

        if (!process.env.MAGIC_TOKEN) {
          jwt.verify(token, process.env.JWT_SECRET)
        }
      } catch {
        throw createError(401, 'Invalid token')
      }

      return next()
    }

    throw createError('Should not happen but it did')
  })
}

export const handleToken = w(async (req, res, next) => {
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
      userInfo = {
        communities_member: [ // eslint-disable-line camelcase
          {
            community: {
              _id: 'acme',
              name: 'ACME'
            }
          }
        ]
      }
    } else {
      throw createError(401, 'Invalid token')
    }
  } else {
    try {
      userInfo = await getUserInfo(token)
    } catch {
      throw createError(401, 'Invalid token')
    }
  }

  if (communityHeader) {
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

    if (process.env.MAGIC_TOKEN) {
      await req.model.updateCommunityParams(req.community.id, {
        maxInputFileSize: '1GB',
        concurrency: 4
      })

      req.community = await req.model.getCommunity(req.community.id)
    }
  }

  if (process.env.MAGIC_TOKEN) {
    req.user = {name: 'Magic User', email: 'magicuser@localhost'}
  } else {
    const {name, email} = readTokenData(token)
    req.user = {email, name}
  }

  next()
})
