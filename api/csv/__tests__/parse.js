import test from 'ava'
import mockFs from 'mock-fs'

import {parseAndValidate} from '../parse.js'

test.before(() => {
  mockFs({
    'path/to/csv': {
      'valid-default.csv': 'column1,column2\nvalue1,value2',
      'valid-utf8.csv': 'column1,column2\nécole,value2',
      'columns.csv': 'column1,column2\nvalue1,value2,value3',
      'delimiter.csv': 'column1\nvalue1',
      'too-many-rows.csv': 'column1,column2\nvalue1,value2\nvalue1,value2\nvalue1,value2\nvalue1,value2'
    },
    node_modules: mockFs.load('node_modules') // eslint-disable-line camelcase
  })
})

test.after(() => {
  mockFs.restore()
})

test('parseAndValidate / no file provided', async t => {
  const req = {}
  const res = {}
  const next = () => {}

  await t.throwsAsync(async () => {
    await parseAndValidate()(req, res, next)
  }, {message: 'A CSV file must be provided in data field'})
})

test('parseAndValidate / delimiter error', async t => {
  const req = {file: {path: 'path/to/csv/delimiter.csv'}}
  const res = {}
  const next = () => {}

  await t.throwsAsync(async () => {
    await parseAndValidate()(req, res, next)
  }, {message: 'Errors in CSV file: UndetectableDelimiter'})
})

test('parseAndValidate / columns error', async t => {
  const req = {file: {path: 'path/to/csv/columns.csv'}}
  const res = {}
  const next = () => {}

  await t.throwsAsync(async () => {
    await parseAndValidate()(req, res, next)
  }, {message: 'Errors in CSV file: TooManyFields'})
})

test('parseAndValidate / too many rows', async t => {
  const req = {file: {path: 'path/to/csv/too-many-rows.csv'}}
  const res = {}
  const next = () => {}

  await t.throwsAsync(async () => {
    await parseAndValidate({maxRows: 2})(req, res, next)
  }, {message: 'Too many rows in CSV file'})
})

test('parseAndValidate / default', async t => {
  const req = {file: {path: 'path/to/csv/valid-default.csv'}}
  const res = {}
  const next = () => {}

  await parseAndValidate()(req, res, next)

  t.deepEqual(req.columnsInFile, ['column1', 'column2'])
  t.deepEqual(req.formatOptions, {
    delimiter: ',',
    linebreak: '\n',
    quoteChar: '"',
    encoding: 'ISO-8859-1'
  })
})

test('parseAndValidate / UTF-8', async t => {
  const req = {file: {path: 'path/to/csv/valid-utf8.csv'}}
  const res = {}
  const next = () => {}

  await parseAndValidate()(req, res, next)

  t.deepEqual(req.columnsInFile, ['column1', 'column2'])
  t.deepEqual(req.formatOptions, {
    delimiter: ',',
    linebreak: '\n',
    quoteChar: '"',
    encoding: 'UTF-8' // eslint-disable-line unicorn/text-encoding-identifier-case
  })
})
