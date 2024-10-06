export function computeOutputFilename(originalFilename, outputFormat = 'csv') {
  if (!originalFilename) {
    return `geocoded.${outputFormat}`
  }

  const pointPos = originalFilename.lastIndexOf('.')

  if (pointPos === -1) {
    return `${originalFilename}-geocoded.${outputFormat}`
  }

  const basename = originalFilename.slice(0, pointPos)

  return `${basename}-geocoded.${outputFormat}`
}
