import process from 'node:process'
import dateTime from 'date-time'

const GPF_LOGGER_ENABLED = process.env.GPF_LOGGER_ENABLED === '1'

const defaultLogger = {
  log: msg => console.log(msg),
  error: msg => console.error(msg)
}

function convertToString(msg) {
  if (typeof msg === 'string') {
    return msg
  }

  if (msg instanceof Error) {
    return msg.message
  }

  return JSON.stringify(msg)
}

const gpfLogger = {
  log: msg => console.log(`${dateTime()}||USER||INFO||${convertToString(msg)}`),
  error: msg => console.log(`${dateTime()}||USER||ERROR||${convertToString(msg)}`)
}

export default GPF_LOGGER_ENABLED ? gpfLogger : defaultLogger
