/* eslint no-await-in-loop: off */
import {finished} from 'node:stream/promises'
import {createGunzip} from 'node:zlib'

import got from 'got'
import tarFs from 'tar-fs'

export async function resolveArchiveUrl(archiveUrl, resolverUrl) {
  if (archiveUrl) {
    console.log(`Archive à utiliser : ${archiveUrl}`)
    return archiveUrl
  }

  console.log(`Résolution à partir de l'URL : ${resolverUrl}`)
  const resolvedArchiveUrl = await got(resolverUrl).text()
  console.log(`Archive à utiliser : ${resolvedArchiveUrl}`)
  return resolvedArchiveUrl
}

export async function downloadAndUnpack(archiveUrl, destPath) {
  const extract = tarFs.extract(destPath)
  const downloadStream = got.stream(archiveUrl)

  let transferred = 0
  let total

  downloadStream.on('downloadProgress', progress => {
    transferred = progress.transferred

    if (!total) {
      total = progress.total
    }
  })

  const progressInterval = setInterval(() => {
    const percentPart = total ? ` / ${((transferred / total) * 100).toFixed(1)}%` : ''
    console.log(`Transféré: ${transferred}${percentPart}`)
  }, 5000)

  downloadStream.pipe(createGunzip()).pipe(extract)
  await finished(extract)

  clearInterval(progressInterval)
}
