import test from 'ava'
import Redis from 'ioredis-mock'
import {upsertCommunity, getCommunity, deleteCommunity} from '../community.js'

/**
 * Setup Redis client mock before each test
 */
test.beforeEach(t => {
  t.context.redis = new Redis()
  t.context.redis.flushall()
})

test.serial('upsertCommunity should insert a new community', async t => {
  const {redis} = t.context

  const community = await upsertCommunity({
    id: '123',
    name: 'Community Name'
  }, {redis})

  t.deepEqual(community, {
    id: '123',
    name: 'Community Name',
    params: {concurrency: 1, maxInputFileSize: '50MB'}
  })
})

test.serial('upsertCommunity should update existing community name', async t => {
  const {redis} = t.context

  // Insérer une communauté initiale
  await redis.hset('community:123', 'id', '123', 'name', 'Old Name')

  const community = {id: '123', name: 'New Name'}

  // Exécuter la fonction pour mettre à jour la communauté existante
  await upsertCommunity(community, {redis})

  // Vérifier si le nom a bien été mis à jour
  const result = await redis.hgetall('community:123')
  t.is(result.name, 'New Name')
})

test.serial('getCommunity should return an existing community', async t => {
  const {redis} = t.context

  // Insérer une communauté
  await redis.hset('community:123', 'id', '123', 'name', 'Community Name', 'params', '{}')

  const community = await getCommunity('123', {redis})
  t.deepEqual(community, {id: '123', name: 'Community Name', params: {}})
})

test.serial('getCommunity should throw 404 error if community is not found', async t => {
  const {redis} = t.context

  await t.throwsAsync(async () => {
    await getCommunity('999', {redis})
  }, {message: 'Community 999 not found'})
})

test.serial('deleteCommunity should delete a community', async t => {
  const {redis} = t.context

  // Insérer deux communautés
  await redis.hset('community:123', 'id', '123', 'name', 'Community 123')
  await redis.rpush('communities', '123')

  await deleteCommunity('123', {redis})

  const community = await redis.hgetall('community:123')
  t.deepEqual(community, {}) // La communauté devrait être supprimée

  const communitiesList = await redis.lrange('communities', 0, -1)
  t.false(communitiesList.includes('123')) // Devrait ne plus figurer dans la liste
})
