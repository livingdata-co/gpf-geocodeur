import test from 'ava'
import {Readable} from 'node:stream'
import getStream from 'get-stream'
import {createWriteStream} from '../csv.js'

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
  t.is(output, 'name,age,city\nJohn,30,New York\nJane,25,San Francisco\nTom,40,Chicago\n')
})

test('createWriteStream / empty', async t => {
  const data = []
  const output = await writeData(data)
  t.is(output, '')
})
