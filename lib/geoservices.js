import process from 'node:process'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {createWriteStream} from 'node:fs'
import {rm, mkdir} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

import fg from 'fast-glob'
import {nanoid} from 'nanoid'
import got from 'got'
import {execa} from 'execa'

const TMP_PATH = process.env.TMP_PATH
  ? path.resolve(process.env.TMP_PATH)
  : tmpdir()

export async function downloadAndExtract(url) {
  const id = nanoid(6)
  const basePath = path.join(TMP_PATH, `archive-${id}`)
  await mkdir(basePath, {recursive: true})
  const archivePath = path.join(basePath, 'archive.7z')

  const downloadStream = got.stream(url)

  await new Promise((resolve, reject) => {
    function onError(errorMessage) {
      reject(new Error(`Failed to download file at URL: ${url} => ${errorMessage}`))
    }

    downloadStream.once('response', response => {
      if (response.statusCode === 200) {
        resolve()
      } else {
        onError()
      }
    })

    downloadStream.once('error', error => onError(error.message))
  })

  await pipeline(
    downloadStream,
    createWriteStream(archivePath)
  )

  await execa('7z', ['x', archivePath], {cwd: basePath})
  await rm(archivePath)

  return {
    basePath,

    getPath(fileName) {
      return getPath(basePath, fileName)
    },

    async cleanup() {
      await rm(basePath, {recursive: true})
    }
  }
}

const CRS_MAPPING = {
  971: 'RGAF09UTM20',
  972: 'RGAF09UTM20',
  973: 'UTM22RGFG95',
  974: 'RGR92UTM40S',
  975: 'RGSPM06U21',
  976: 'RGM04UTM38S',
  977: 'RGAF09UTM20',
  978: 'RGAF09UTM20'
}

export function getArchiveURL(baseURL, codeDepartement) {
  if (codeDepartement.length === 2) {
    return baseURL
      .replaceAll('{dep}', `D0${codeDepartement}`)
      .replaceAll('{crs}', 'LAMB93')
  }

  if (!(codeDepartement in CRS_MAPPING)) {
    throw new Error('Unknown codeDepartement')
  }

  return baseURL
    .replaceAll('{dep}', `D${codeDepartement}`)
    .replaceAll('{crs}', CRS_MAPPING[codeDepartement])
}

export async function getPath(basePath, fileName) {
  const [filePath] = await fg(
    ['**/' + fileName],
    {absolute: true, unique: true, cwd: basePath, caseSensitiveMatch: false}
  )

  return filePath
}
