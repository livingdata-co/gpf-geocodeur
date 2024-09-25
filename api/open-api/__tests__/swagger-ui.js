import test from 'ava'
import {computeHtmlPage} from '../swagger-ui.js'

test('computeHtmlPage', t => {
  const pageTitle = 'Test Page'
  const openApiDefinitionUrl = 'https://example.com/open-api.json'
  const actual = computeHtmlPage({pageTitle, openApiDefinitionUrl})
  t.snapshot(actual)
})
