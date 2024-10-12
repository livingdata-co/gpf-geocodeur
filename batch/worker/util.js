import {cpus} from 'node:os'

export function getConcurrency(env) {
  if (env.WORKERS_CONCURRENCY) {
    return Number.parseInt(env.WORKERS_CONCURRENCY, 10)
  }

  return cpus().length
}
