import nanoid from 'nanoid'

export async function acquireLock(lockName, lockTimeout, {redis}) {
  const lockKey = `lock:${lockName}`
  const lockValue = nanoid()
  const lockAcquired = await redis.set(lockKey, lockValue, 'NX', 'PX', lockTimeout)
  return lockAcquired ? lockValue : null
}

export async function releaseLock(lockName, lockValue, {redis}) {
  const lockKey = `lock:${lockName}`
  const currentLockValue = await redis.get(lockKey)
  if (currentLockValue === lockValue) {
    await redis.del(lockKey)
    return true
  }

  return false
}
