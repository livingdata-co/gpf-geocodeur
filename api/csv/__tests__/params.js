import test from 'ava'
import {getLon, getLat} from '../params.js'

test('getLon with fieldName', t => {
  const item = {customField: '12.34'}
  const fieldName = 'customField'
  t.is(getLon(item, fieldName), 12.34)
})

test('getLon with longitude field', t => {
  const item = {longitude: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with lon field', t => {
  const item = {lon: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with lng field', t => {
  const item = {lng: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with long field', t => {
  const item = {long: '12.34'}
  t.is(getLon(item), 12.34)
})

test('getLon with no matching field', t => {
  const item = {otherField: '12.34'}
  t.is(getLon(item), undefined)
})

test('getLat with fieldName', t => {
  const item = {customField: '56.78'}
  const fieldName = 'customField'
  t.is(getLat(item, fieldName), 56.78)
})

test('getLat with latitude field', t => {
  const item = {latitude: '56.78'}
  t.is(getLat(item), 56.78)
})

test('getLat with lat field', t => {
  const item = {lat: '56.78'}
  t.is(getLat(item), 56.78)
})

test('getLat with no matching field', t => {
  const item = {otherField: '56.78'}
  t.is(getLat(item), undefined)
})
