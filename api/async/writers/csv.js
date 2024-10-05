import stringify from 'csv-write-stream'

export function createWriteStream() {
  return stringify()
}
