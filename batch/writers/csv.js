import stringify from 'csv-write-stream'

export function createWriteStream(formatOptions = {}) {
  return stringify({
    separator: formatOptions.delimiter,
    newline: formatOptions.linebreak
  })
}
