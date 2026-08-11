'use strict'

const fs = require('fs')
const path = require('path')

const LOG_DIR = path.resolve(__dirname, '../../../logs')

function ensureLogDir () {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function dayStamp (date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function serializeErr (err) {
  if (!err) {
    return null
  }

  return {
    name: err.name || null,
    message: err.message || String(err),
    code: err.code || null,
    statusCode: err.statusCode || err.status || null,
    stack: err.stack || null
  }
}

function writeLine (level, payload = {}) {
  try {
    ensureLogDir()

    const filePath = path.join(LOG_DIR, `exceptions-${dayStamp()}.log`)
    const { err, ...rest } = payload
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        ...rest,
        err: serializeErr(err)
      }) + '\n'

    fs.appendFileSync(filePath, line, 'utf8')
  } catch (writeErr) {
    console.error('[exceptionLogger] write failed:', writeErr.message)
    if (payload?.err) {
      console.error('[error]', payload.err.stack || payload.err)
    }
  }
}

function error (payload = {}) {
  writeLine('error', payload)

  if (payload.err?.stack) {
    console.error('[error]', payload.err.stack)
  } else if (payload.message) {
    console.error('[error]', payload.message)
  }
}

function warn (payload = {}) {
  writeLine('warn', payload)
}

module.exports = {
  LOG_DIR,
  error,
  warn
}
