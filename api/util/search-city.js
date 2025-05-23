import {deburr, chain} from 'lodash-es'
import Flexsearch from 'flexsearch'

import computeDistance from '../../vendor/jaro-winkler-distance.cjs'
import {getCommunes} from '../../lib/cog.js'

const SEARCH_CITY_MIN_SCORE = 0.85

const codesIndex = new Map()
const namesIndex = new Flexsearch.Index({
  tokenize: 'forward',
  optimize: false
})
const smallNamesIndex = new Map()

for (const commune of getCommunes()) {
  codesIndex.set(commune.code, commune)

  const normalizedName = normalizeString(commune.nom)
  commune._normalizedNom = normalizedName

  if (normalizedName.length <= 3) {
    smallNamesIndex.set(normalizedName, commune.code)
  } else {
    namesIndex.add(commune.code, normalizedName)
  }
}

function searchCandidates(q) {
  if (q.length <= 3) {
    const candidate = smallNamesIndex.get(q)
    return candidate ? [candidate] : []
  }

  return namesIndex.search(q)
}

export function searchCity(inputString) {
  const normalizedInput = normalizeString(inputString).trim()

  return chain(searchCandidates(normalizedInput))
    .map(code => {
      const commune = codesIndex.get(code)

      return {
        code: commune.code,
        nom: commune.nom,
        score: computeDistance(normalizedInput, commune._normalizedNom, {ignoreCase: false})
      }
    })
    .filter(r => r.score >= SEARCH_CITY_MIN_SCORE)
    .sortBy(r => -r.score)
    .value()
}

export function normalizeString(string) {
  return deburr(string)
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/g, ' ')
    .replaceAll(/sainte?\s/g, 'st ')
}
