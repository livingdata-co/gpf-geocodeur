import path from 'node:path'
import process from 'node:process'

export const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve('./data')

export const CAD_DATA_PATH = path.join(DATA_PATH, 'cadastre', 'data')
export const CAD_INDEX_PATH = path.join(DATA_PATH, 'cadastre', 'index')
export const CAD_INDEX_MDB_BASE_PATH = path.join(CAD_INDEX_PATH, 'cadastre')
export const CAD_INDEX_MDB_PATH = path.join(CAD_INDEX_PATH, 'cadastre.mdb')
export const CAD_INDEX_RTREE_PATH = path.join(CAD_INDEX_PATH, 'cadastre.rtree')
export const CAD_DATA_CATEGORIES_PATH = path.join(CAD_DATA_PATH, 'categories.json')
export const CAD_INDEX_CATEGORIES_PATH = path.join(CAD_INDEX_PATH, 'categories.json')
