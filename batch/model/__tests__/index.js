import test from 'ava'
import {initModel} from '../index.js'

test('initModel', async t => {
  const fakeRedis = {
    ping: () => Promise.resolve('PONG'),
    duplicate: () => fakeRedis
  }

  const fakeStorage = {}

  const model = await initModel({
    redis: fakeRedis,
    storage: fakeStorage
  })

  t.is(typeof model.createProject, 'function')
  t.is(typeof model.upsertCommunity, 'function')
  t.is(typeof model.acquireLock, 'function')
})
