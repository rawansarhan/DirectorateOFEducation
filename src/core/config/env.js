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

function intOptional (name, defaultValue) {
  const raw = optional(name)

  if (raw === undefined) {
    return defaultValue
  }

  const value = Number(raw)

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number in .env`)
  }

  return value
}

function boolOptional (name, defaultValue = false) {
  const raw = optional(name)

  if (raw === undefined) {
    return defaultValue
  }

  return raw.toLowerCase() === 'true'
}

function stripQuotes (value) {
  return String(value).replace(/^"|"$/g, '')
}

const PORT = intRequired('PORT')
const JWT_SECRET = required('JWT_SECRET')
const JWT_ACCESS_SECRET = optional('JWT_ACCESS_SECRET') || JWT_SECRET
const JWT_REFRESH_SECRET =
  optional('JWT_REFRESH_SECRET') || `${JWT_SECRET}_refresh`

module.exports = {
  NODE_ENV: optional('NODE_ENV') || 'development',

  // ── Server ──────────────────────────────────────────────────────────────
  PORT,
  API_PUBLIC_URL: optional('API_PUBLIC_URL') || `http://localhost:${PORT}`,
  UPLOADS_DIR: optional('UPLOADS_DIR'),

  // ── Database ───────────────────────────────────────────────────────────
  DB_HOST: required('DB_HOST'),
  DB_PORT: intRequired('DB_PORT'),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: stripQuotes(required('DB_PASSWORD')),

  // ── JWT / Auth ─────────────────────────────────────────────────────────
  JWT_SECRET,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN:
    optional('JWT_EXPIRES_IN') ||
    optional('JWT_ACCESS_EXPIRES_IN') ||
    '1h',
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN') || '1h',
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN') || '30d',

  // AES-256-GCM — POST /api/transaction/submit/process/{id}/encrypted
  // توليد: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  SUBMIT_AES_KEY_BASE64: optional('SUBMIT_AES_KEY_BASE64'),

  // Ed25519 — توقيع QR في PDF (npm run keys:authority)
  INTEGRITY_AUTHORITY_PRIVATE_KEY: optional('INTEGRITY_AUTHORITY_PRIVATE_KEY'),
  INTEGRITY_AUTHORITY_PUBLIC_KEY: optional('INTEGRITY_AUTHORITY_PUBLIC_KEY'),

  AUTH_CHALLENGE_TTL_MS: intRequired('AUTH_CHALLENGE_TTL_MS'),
  PIN_SESSION_TTL_MS: intRequired('PIN_SESSION_TTL_MS'),
  TX_SIGN_TTL_MS: intRequired('TX_SIGN_TTL_MS'),
  OTP_TTL_MINUTES: intOptional('OTP_TTL_MINUTES', 10),
  BCRYPT_ROUNDS: intOptional('BCRYPT_ROUNDS', 10),

  // ── Email / SMS ────────────────────────────────────────────────────────
  EMAIL_USER: required('EMAIL_USER'),
  EMAIL_PASS: required('EMAIL_PASS'),
  TRACCAR_URL: required('TRACCAR_URL'),
  TRACCAR_TOKEN: required('TRACCAR_TOKEN'),

  // ── Cloudinary (اختياري) ───────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET'),

  // ── Camunda ────────────────────────────────────────────────────────────
  CAMUNDA_URL: required('CAMUNDA_URL'),
  CAMUNDA_TIMEOUT_MS: intOptional('CAMUNDA_TIMEOUT_MS', 30000),
  GENERATE_PDF_REQUEST_TIMEOUT_MS: intOptional(
    'GENERATE_PDF_REQUEST_TIMEOUT_MS',
    8000
  ),

  // ── Redis / Cache ──────────────────────────────────────────────────────
  REDIS_URL: optional('REDIS_URL'),
  API_CACHE_TTL_SECONDS: intOptional('API_CACHE_TTL_SECONDS', 3600),
  PROCESS_CACHE_TTL_SECONDS: intOptional('PROCESS_CACHE_TTL_SECONDS', 3600),
  EMPLOYEE_TASKS_CACHE_TTL_SECONDS: intOptional('EMPLOYEE_TASKS_CACHE_TTL_SECONDS', 60),
  FINAL_DOCUMENT_CACHE_TTL_SECONDS: intOptional('FINAL_DOCUMENT_CACHE_TTL_SECONDS', 3600),
  TASK_DETAILS_CACHE_TTL_SECONDS: intOptional('TASK_DETAILS_CACHE_TTL_SECONDS', 30),
  CURRENT_STAGE_CACHE_TTL_SECONDS: intOptional('CURRENT_STAGE_CACHE_TTL_SECONDS', 600),

  // ── Microservice URLs (داخلية) ─────────────────────────────────────────
  TRANSACTION_SERVICE_URL: required('TRANSACTION_SERVICE_URL'),
  WORKFLOW_SERVICE_URL: required('WORKFLOW_SERVICE_URL'),
  ORGANIZATION_SERVICE_URL: required('ORGANIZATION_SERVICE_URL'),
  AUTH_SERVICE_URL: required('AUTH_SERVICE_URL'),

  // ── Security / Rate limits ─────────────────────────────────────────────
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
  RATE_LIMIT_FINAL_DOC_WINDOW_MS: intOptional('RATE_LIMIT_FINAL_DOC_WINDOW_MS', 10 * 1000),
  RATE_LIMIT_FINAL_DOC_MAX: intOptional('RATE_LIMIT_FINAL_DOC_MAX', 3),
  RATE_LIMIT_UPLOAD_WINDOW_MS: intOptional('RATE_LIMIT_UPLOAD_WINDOW_MS', 60 * 1000),
  RATE_LIMIT_UPLOAD_MAX: intOptional('RATE_LIMIT_UPLOAD_MAX', 15),

  TRANSACTION_UPLOAD_DAILY_MAX_FILES: intOptional('TRANSACTION_UPLOAD_DAILY_MAX_FILES', 50),
  TRANSACTION_UPLOAD_DAILY_MAX_MB: intOptional('TRANSACTION_UPLOAD_DAILY_MAX_MB', 200),
  TRANSACTION_FILE_MAX_MB: intOptional('TRANSACTION_FILE_MAX_MB', 25),
  TASK_LOCK_TTL_MS: intOptional('TASK_LOCK_TTL_MS', 15 * 60 * 1000),

  // ── WebSocket notifications ────────────────────────────────────────────
  WS_PATH: optional('WS_PATH') || '/ws',
  WS_PORT: intOptional('WS_PORT', 4100),
  WS_DEMO: boolOptional('WS_DEMO', false),
  WS_DEMO_INTERVAL_MS: intOptional('WS_DEMO_INTERVAL_MS', 15000),

  // ── PDF / Documents ────────────────────────────────────────────────────
  PDF_ARABIC_SHAPING: optional('PDF_ARABIC_SHAPING') || 'logical',
  PDF_UNICODE_FONT_PATH: optional('PDF_UNICODE_FONT_PATH'),
  REPUBLIC_LOGO_PATH: optional('REPUBLIC_LOGO_PATH'),

  // ── Jobs / Outbox / Workflow sync ──────────────────────────────────────
  OUTBOX_POLL_INTERVAL_MS: intRequired('OUTBOX_POLL_INTERVAL_MS'),
  PROCESS_ACTIVATION_CRON: required('PROCESS_ACTIVATION_CRON'),

  SERVICE_TASK_SYNC_ENABLED: boolOptional('SERVICE_TASK_SYNC_ENABLED', true),
  SERVICE_TASK_SYNC_CRON: optional('SERVICE_TASK_SYNC_CRON') || '*/1 * * * *',
  SERVICE_TASK_SYNC_BATCH_SIZE: intOptional('SERVICE_TASK_SYNC_BATCH_SIZE', 40),
  SERVICE_TASK_SYNC_CONCURRENCY: intOptional('SERVICE_TASK_SYNC_CONCURRENCY', 3),
  SERVICE_TASK_SYNC_STALE_MS: intOptional('SERVICE_TASK_SYNC_STALE_MS', 2 * 60 * 1000),

  COMPLETE_RECOVERY_BATCH_SIZE: intOptional('COMPLETE_RECOVERY_BATCH_SIZE', 20),
  COMPLETE_RECOVERY_CONCURRENCY: intOptional('COMPLETE_RECOVERY_CONCURRENCY', 2),
  COMPLETE_RECOVERY_MAX_ATTEMPTS: intOptional('COMPLETE_RECOVERY_MAX_ATTEMPTS', 30),

  RETRY_MAX_ATTEMPTS: intOptional('RETRY_MAX_ATTEMPTS', 3),
  RETRY_BASE_DELAY_MS: intOptional('RETRY_BASE_DELAY_MS', 300),
  RETRY_MAX_DELAY_MS: intOptional('RETRY_MAX_DELAY_MS', 5000)
}
