import test from 'ava'

import {mergeResults} from '../batch.js'

test('mergeResults should return the best result', t => {
  const indexesResults = {
    index1: [
      {status: 'ok', result: {score: 1}},
      {status: 'ok', result: {score: 3}},
      {status: 'ok', result: {score: 2}},
      {status: 'not-found', result: {}}
    ],
    index2: [
      {status: 'ok', result: {score: 3}},
      {status: 'ok', result: {score: 2}},
      {status: 'ok', result: {score: 1.5}},
      {status: 'ok', result: {score: 0.5}}
    ]
  }

  const result = mergeResults(indexesResults)

  t.deepEqual(result, [
    {status: 'ok', result: {score: 3}, index: 'index2'},
    {status: 'ok', result: {score: 3}, index: 'index1'},
    {status: 'ok', result: {score: 2}, index: 'index1'},
    {status: 'ok', result: {score: 0.5}, index: 'index2'}
  ])
})

test('mergeResults should return the error result if any and no successful result', t => {
  const indexesResults = {
    index1: [
      {status: 'not-found'},
      {status: 'ok', result: {score: 3}}
    ],
    index2: [
      {status: 'error', result: {message: 'error'}},
      {status: 'error', result: {message: 'error'}}
    ]
  }

  const result = mergeResults(indexesResults)

  t.deepEqual(result, [
    {status: 'error', result: {message: 'error'}},
    {status: 'ok', result: {score: 3}, index: 'index1'}
  ])
})

test('mergeResults should return not-found if no successful result and no error result', t => {
  const indexesResults = {
    index1: [
      {status: 'not-found'}
    ],
    index2: [
      {status: 'not-found'}
    ]
  }

  const result = mergeResults(indexesResults)

  t.deepEqual(result, [{status: 'not-found', result: {}}])
})
