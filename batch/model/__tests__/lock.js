import test from 'ava'
import Redis from 'ioredis-mock'
import {acquireLock, releaseLock} from '../lock.js'

/**
 * Setup Redis client mock before each test
 */
test.beforeEach(t => {
  t.context.redis = new Redis()
  t.context.redis.flushall()
})

test.serial('acquireLock should acquire a lock when empty', async t => {
  const {redis} = t.context

  const lock = await acquireLock('my-lock', 1000, {redis})
  t.truthy(lock)
})

test.serial('acquireLock should not acquire a lock when already acquired', async t => {
  const {redis} = t.context

  await acquireLock('my-lock', 1000, {redis})
  const lock = await acquireLock('my-lock', 1000, {redis})
  t.falsy(lock)
})

test.serial('releaseLock should release a lock', async t => {
  const {redis} = t.context

  const lock = await acquireLock('my-lock', 1000, {redis})
  t.truthy(lock)
  const released = await releaseLock('my-lock', lock, {redis})
  t.true(released)

  const secondLock = await acquireLock('my-lock', 1000, {redis})
  t.truthy(secondLock)
})

test.serial('releaseLock should not release a lock if token is invalid', async t => {
  const {redis} = t.context

  const lock = await acquireLock('my-lock', 1000, {redis})
  t.truthy(lock)
  const released = await releaseLock('my-lock', 'invalid token', {redis})
  t.false(released)
})
