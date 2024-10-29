/* eslint-disable camelcase */
import process from 'node:process'

import test from 'ava'
import nock from 'nock'

import {getAuthStrategyFromTokenType, handleToken} from '../auth.js'

const {GPF_API_URL} = process.env

function createFakeReq(headers) {
  return {
    get: key => headers[key]
  }
}

async function runMiddleware(middleware, req) {
  let error

  await new Promise(resolve => {
    middleware(req, {}, thrownError => {
      error = thrownError
      resolve()
    })
  })

  if (error) {
    throw error
  }

  return req
}

test('getAuthStrategyFromTokenType', t => {
  t.is(getAuthStrategyFromTokenType('Bearer'), 'admin')
  t.is(getAuthStrategyFromTokenType('Token'), 'project')
  t.throws(() => getAuthStrategyFromTokenType('Invalid'), {message: 'Invalid token type'})
})

test('handleToken / empty headers', async t => {
  const req = createFakeReq({})
  await runMiddleware(handleToken, req)
  t.pass()
})

test('handleToken / community only', async t => {
  const req = createFakeReq({'X-Community': 'test'})
  await t.throwsAsync(
    () => runMiddleware(handleToken, req), {message: 'Authentication required'}
  )
})

test('handleToken / invalid token type', async t => {
  const req = createFakeReq({Authorization: 'Invalid'})
  await t.throwsAsync(
    () => runMiddleware(handleToken, req), {message: 'Invalid Authorization header'}
  )
})

test('handleToken / invalid token', async t => {
  const req = createFakeReq({Authorization: 'Bearer invalid'})

  nock(GPF_API_URL)
    .get('/users/me')
    .reply(401)

  await t.throwsAsync(
    () => runMiddleware(handleToken, req), {message: 'Invalid token'}
  )
})

test('handleToken / valid token', async t => {
  const tokenData = {name: 'foo', email: 'bar'}
  const token = `xxxx.${Buffer.from(JSON.stringify(tokenData)).toString('base64')}.xxxx`

  const req = createFakeReq({Authorization: `Bearer ${token}`})

  nock(GPF_API_URL)
    .get('/users/me')
    .reply(200, {id: 1, communities_member: []})

  await runMiddleware(handleToken, req)

  t.is(req.user.name, tokenData.name)
  t.is(req.user.email, tokenData.email)
})

test('handleToken / valid token with community', async t => {
  const tokenData = {name: 'foo', email: 'bar'}
  const token = `xxxx.${Buffer.from(JSON.stringify(tokenData)).toString('base64')}.xxxx`

  const req = createFakeReq({
    Authorization: `Bearer ${token}`,
    'X-Community': 'test'
  })

  req.model = {
    upsertCommunity: async community => community
  }

  nock(GPF_API_URL)
    .get('/users/me')
    .reply(200, {
      id: 1,
      communities_member: [
        {community: {_id: 'test', name: 'Test'}}
      ]
    })

  await runMiddleware(handleToken, req)

  t.is(req.user.name, tokenData.name)
  t.is(req.user.email, tokenData.email)
  t.is(req.community.id, 'test')
  t.is(req.community.name, 'Test')
})

test('handleToken / valid token with invalid community', async t => {
  const tokenData = {name: 'foo', email: 'bar'}
  const token = `xxxx.${Buffer.from(JSON.stringify(tokenData)).toString('base64')}.xxxx`

  const req = createFakeReq({
    Authorization: `Bearer ${token}`,
    'X-Community': 'invalid'
  })

  nock(GPF_API_URL)
    .get('/users/me')
    .reply(200, {
      id: 1,
      communities_member: [
        {community: {_id: 'test', name: 'Test'}}
      ]
    })

  await t.throwsAsync(
    () => runMiddleware(handleToken, req), {message: 'User is not a member of this community'}
  )
})
