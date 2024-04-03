import {createRequire} from 'node:module'
import {readFile, access} from 'node:fs/promises'
import test from 'ava'
import nock from 'nock'
import {getArchiveURL, downloadAndExtractBase} from '../geoservices.js'

const require = createRequire(import.meta.url)

test('getArchiveURL', t => {
  const baseURL = 'https://sample.test/{dep}/{crs}'

  t.is(getArchiveURL(baseURL, '12'), 'https://sample.test/D012/LAMB93')
})

test('getArchiveURL / CRS_MAPPING', t => {
  const baseURL = 'https://sample.test/{dep}/{crs}'

  t.is(getArchiveURL(baseURL, '971'), 'https://sample.test/D971/RGAF09UTM20')
})

test('getArchiveURL / Unknown codeDepartement', t => {
  const baseURL = 'https://sample.test/{dep}/{crs}'

  t.throws(() => {
    getArchiveURL(baseURL, '979')
  }, {instanceOf: Error, message: 'Unknown codeDepartement'})
})

test('getArchiveURL / Multiple replacements', t => {
  const baseURL = 'https://sample.test/{dep}/{crs}/{dep}-{crs}'
  t.is(getArchiveURL(baseURL, '57'), 'https://sample.test/D057/LAMB93/D057-LAMB93')
})

test('downloadAndExtract', async t => {
  nock('http://geoservices')
    .get('/archive.7z')
    .replyWithFile(200, require.resolve('./__fixtures__/archive.7z'))

  const archive = await downloadAndExtractBase('http://geoservices/archive.7z')

  const file1Path = await archive.getPath('file1.txt')
  t.is(await readFile(file1Path, {encoding: 'utf8'}), 'foo\n')

  const file2Path = await archive.getPath('file2.txt')
  t.is(await readFile(file2Path, {encoding: 'utf8'}), 'bar\n')

  await t.notThrowsAsync(() => access(archive.basePath))
  await archive.cleanup()
  await t.throwsAsync(() => access(archive.basePath))
})
