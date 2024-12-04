import process from 'node:process'

export const GEOCODE_INDEXES = process.env.GEOCODE_INDEXES
  ? process.env.GEOCODE_INDEXES.split(',')
  : ['address', 'poi', 'parcel']

export const BATCH_ASYNC_FLUSH_AFTER_N_DAYS = process.env.BATCH_ASYNC_FLUSH_AFTER_N_DAYS
  ? Number(process.env.BATCH_ASYNC_FLUSH_AFTER_N_DAYS)
  : 14

export const GPF_API_URL = process.env.GPF_API_URL || 'https://data.geopf.fr/api'

export const BATCH_ASYNC_DEFAULT_COMMUNITY_PARAMS = {maxInputFileSize: '50MB', concurrency: 1}

export const {HTTP_PROXY, HTTPS_PROXY} = process.env
