import test from 'ava'
import {Readable} from 'node:stream'
import getStream from 'get-stream'
import {createWriteStream} from '../geojson.js'

async function writeData(data) {
  const csvStream = createWriteStream()
  const inputStream = Readable.from(data)
  return getStream(inputStream.pipe(csvStream))
}

test('createWriteStream / valid', async t => {
  const data = [
    {name: 'John', age: 30, city: 'New York'},
    {name: 'Jane', age: 25, city: 'San Francisco'},
    {name: 'Tom', age: 40, city: 'Chicago'}
  ]

  const output = await writeData(data)
  console.log(output)
  t.is(output, `{"type":"FeatureCollection","features": [
{"type":"Feature","geometry":null,"properties":{"name":"John","age":30,"city":"New York"}},
{"type":"Feature","geometry":null,"properties":{"name":"Jane","age":25,"city":"San Francisco"}},
{"type":"Feature","geometry":null,"properties":{"name":"Tom","age":40,"city":"Chicago"}}
]}
`)
})

test('createWriteStream / empty', async t => {
  const data = []
  const output = await writeData(data)
  t.is(output, `{"type":"FeatureCollection","features": [

]}
`)
})
