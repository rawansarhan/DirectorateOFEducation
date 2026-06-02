'use strict'

const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

function required (name) {
  const value = process.env[name]

  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} is not defined in .env`)
  }

  return String(value).trim()
}

function optional (name) {
  const value = process.env[name]

  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined
  }

  return String(value).trim()
}

function intRequired (name) {
  const value = Number(required(name))

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number in .env`)
  }

  return value
}

function intOptional (name) {
  const raw = optional(name)

  if (raw === undefined) {
    return undefined
  }

  const value = Number(raw)

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number in .env`)
  }

  return value
}

function stripQuotes (value) {
  return String(value).replace(/^"|"$/g, '')
}

const PORT = intRequired('PORT')

module.exports = {
  NODE_ENV: optional('NODE_ENV') || 'development',

  PORT,
  API_PUBLIC_URL: optional('API_PUBLIC_URL') || `http://localhost:${PORT}`,

  DB_HOST: required('DB_HOST'),
  DB_PORT: intRequired('DB_PORT'),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: stripQuotes(required('DB_PASSWORD')),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: required('JWT_EXPIRES_IN'),

  EMAIL_USER: required('EMAIL_USER'),
  EMAIL_PASS: required('EMAIL_PASS'),

  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET'),

  CAMUNDA_URL: required('CAMUNDA_URL'),

  TRACCAR_URL: required('TRACCAR_URL'),
  TRACCAR_TOKEN: required('TRACCAR_TOKEN'),

  REDIS_URL: optional('REDIS_URL'),

  TRANSACTION_SERVICE_URL: required('TRANSACTION_SERVICE_URL'),
  WORKFLOW_SERVICE_URL: required('WORKFLOW_SERVICE_URL'),
  ORGANIZATION_SERVICE_URL: required('ORGANIZATION_SERVICE_URL'),
  AUTH_SERVICE_URL: required('AUTH_SERVICE_URL'),

  API_CACHE_TTL_SECONDS: intRequired('API_CACHE_TTL_SECONDS'),
  PROCESS_CACHE_TTL_SECONDS: intRequired('PROCESS_CACHE_TTL_SECONDS'),

  OPERATION_MIN_INTERVAL_MS: intRequired('OPERATION_MIN_INTERVAL_MS'),
  IDEMPOTENCY_TTL_MS: intRequired('IDEMPOTENCY_TTL_MS'),
  OPERATION_GUARD_CLEANUP_MS: intRequired('OPERATION_GUARD_CLEANUP_MS'),

  SECURITY_MAX_FAILED_ATTEMPTS: intRequired('SECURITY_MAX_FAILED_ATTEMPTS'),
  SECURITY_LOCK_DURATION_MS: intRequired('SECURITY_LOCK_DURATION_MS'),

  RATE_LIMIT_AUTH_WINDOW_MS: intRequired('RATE_LIMIT_AUTH_WINDOW_MS'),
  RATE_LIMIT_AUTH_MAX: intRequired('RATE_LIMIT_AUTH_MAX'),
  RATE_LIMIT_AUTH_BRUTE_WINDOW_MS: intRequired('RATE_LIMIT_AUTH_BRUTE_WINDOW_MS'),
  RATE_LIMIT_AUTH_BRUTE_MAX: intRequired('RATE_LIMIT_AUTH_BRUTE_MAX'),
  RATE_LIMIT_SIGN_WINDOW_MS: intRequired('RATE_LIMIT_SIGN_WINDOW_MS'),
  RATE_LIMIT_SIGN_MAX: intRequired('RATE_LIMIT_SIGN_MAX'),
  RATE_LIMIT_COMPLETE_WINDOW_MS: intRequired('RATE_LIMIT_COMPLETE_WINDOW_MS'),
  RATE_LIMIT_COMPLETE_MAX: intRequired('RATE_LIMIT_COMPLETE_MAX'),
  RATE_LIMIT_SUBMIT_WINDOW_MS: intRequired('RATE_LIMIT_SUBMIT_WINDOW_MS'),
  RATE_LIMIT_SUBMIT_MAX: intRequired('RATE_LIMIT_SUBMIT_MAX'),

  TASK_LOCK_TTL_MS: intRequired('TASK_LOCK_TTL_MS'),

  AUTH_CHALLENGE_TTL_MS: intRequired('AUTH_CHALLENGE_TTL_MS'),
  PIN_SESSION_TTL_MS: intRequired('PIN_SESSION_TTL_MS'),
  TX_SIGN_TTL_MS: intRequired('TX_SIGN_TTL_MS'),

  OTP_TTL_MINUTES: intRequired('OTP_TTL_MINUTES'),
  BCRYPT_ROUNDS: intRequired('BCRYPT_ROUNDS'),

  OUTBOX_POLL_INTERVAL_MS: intRequired('OUTBOX_POLL_INTERVAL_MS'),
  PROCESS_ACTIVATION_CRON: required('PROCESS_ACTIVATION_CRON')
}
