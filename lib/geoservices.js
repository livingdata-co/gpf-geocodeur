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
import pRetry from 'p-retry'

import logger from './logger.js'

const TMP_PATH = process.env.TMP_PATH
  ? path.resolve(process.env.TMP_PATH)
  : tmpdir()

const GEOSERVICES_DOWNLOAD_RETRIES = process.env.GEOSERVICES_DOWNLOAD_RETRIES
  ? Number.parseInt(process.env.GEOSERVICES_DOWNLOAD_RETRIES, 10)
  : 1

export async function downloadAndExtractBase(url) {
  const id = nanoid(6)
  const basePath = path.join(TMP_PATH, `archive-${id}`)
  await mkdir(basePath, {recursive: true})
  const archivePath = path.join(basePath, 'archive.7z')

  const downloadStream = got.stream(url)

  let transferred = 0
  let total

  downloadStream.on('downloadProgress', progress => {
    transferred = progress.transferred
    if (!total) {
      total = progress.total
      logger.log(`Total à transférer : ${total}`)
    }
  })

  let progressInterval

  try {
    progressInterval = setInterval(() => {
      const percentPart = total ? ` / ${((transferred / total) * 100).toFixed(1)}%` : ''
      logger.log(`Transféré : ${transferred}${percentPart}`)
    }, 5000)

    await new Promise((resolve, reject) => {
      function onError(errorMessage) {
        logger.error(`Erreur lors du téléchargement de ${url} : ${errorMessage}`)
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
  } finally {
    clearInterval(progressInterval)
    await rm(archivePath, {force: true})
  }

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

export async function downloadAndExtract(url) {
  if (GEOSERVICES_DOWNLOAD_RETRIES > 0) {
    logger.log(`Téléchargement avec retry=${GEOSERVICES_DOWNLOAD_RETRIES}`)
    return pRetry(() => downloadAndExtractBase(url), {
      retries: GEOSERVICES_DOWNLOAD_RETRIES,
      onFailedAttempt(error) {
        logger.log(`Échec de la tentative ${error.attemptNumber}. Il reste ${error.retriesLeft} tentative(s).`)
      }
    })
  }

  return downloadAndExtractBase(url)
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
