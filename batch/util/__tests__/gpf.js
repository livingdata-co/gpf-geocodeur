import test from 'ava'
import {readTokenData} from '../gpf.js'

test('readTokenData', t => {
  const token = `xxxx.${Buffer.from(JSON.stringify({foo: 'bar'})).toString('base64')}.xxxx`
  t.deepEqual(readTokenData(token), {foo: 'bar'})
})
