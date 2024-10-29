import {cpus} from 'node:os'
import test from 'ava'
import {getConcurrency, execIfLockAcquired} from '../util.js'

test('getConcurrency', t => {
  t.is(getConcurrency({}), cpus().length)
  t.is(getConcurrency({WORKERS_CONCURRENCY: '10'}), 10)
})

test('execIfLockAcquire / acquired', async t => {
  let acquireCalled = false
  let releaseCalled = false
  let handlerCalled = false

  const model = {
    async acquireLock() {
      acquireCalled = true
      return true
    },
    async releaseLock() {
      releaseCalled = true
    }
  }

  await execIfLockAcquired('test', 1000, model, async () => {
    handlerCalled = true
  })

  t.true(acquireCalled)
  t.true(handlerCalled)
  t.true(releaseCalled)
})

test('execIfLockAcquire / not acquired', async t => {
  let acquireCalled = false
  let releaseCalled = false
  let handlerCalled = false

  const model = {
    async acquireLock() {
      acquireCalled = true
      return false
    },
    async releaseLock() {
      releaseCalled = true
    }
  }

  await execIfLockAcquired('test', 1000, model, async () => {
    handlerCalled = true
  })

  t.true(acquireCalled)
  t.false(handlerCalled)
  t.false(releaseCalled)
})
