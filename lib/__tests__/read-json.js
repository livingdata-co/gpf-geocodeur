import test from 'ava'
import mockFs from 'mock-fs'
import readJson from '../read-json.js'

test.before(() => {
  mockFs({
    'fake.json': '{"foo": "bar"}'
  })
})

test.after(() => {
  mockFs.restore()
})

test('readJson', async t => {
  const result = await readJson('fake.json')

  t.deepEqual(result, {foo: 'bar'})
})
