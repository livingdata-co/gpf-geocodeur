export function computeOutputFilename(originalName, outputFormat) {
  const lastPointPos = originalName.lastIndexOf('.')

  if (lastPointPos === -1 || lastPointPos === 0) {
    return `${originalName}.geocoded.${outputFormat}`
  }

  return `${originalName.slice(0, lastPointPos)}.geocoded.${outputFormat}`
}
