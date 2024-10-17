import process from 'node:process'

export const GEOCODE_INDEXES = process.env.GEOCODE_INDEXES
  ? process.env.GEOCODE_INDEXES.split(',')
  : ['address', 'poi', 'parcel']

export const BATCH_ASYNC_FLUSH_AFTER_N_DAYS = process.env.BATCH_ASYNC_FLUSH_AFTER_N_DAYS
  ? Number(process.env.BATCH_ASYNC_FLUSH_AFTER_N_DAYS)
  : 14
