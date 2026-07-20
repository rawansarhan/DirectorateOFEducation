'use strict'

const { Op } = require('sequelize')
const { OutboxEvent } = require('../../../../entities')
const OutboxRepository = require('../repositories/OutboxRepository')
const eventBus = require('../../events/eventBus')
const EVENTS = require('../../events/types')
const { RETRY_MAX_ATTEMPTS } = require('../../../config/env')
const {
  handleGeneratePdfFailure
} = require('../../../../modules/notification/services/generatePdfFailureHandlerService')

function payloadTransactionId (payload) {
  return Number(payload?.transaction_id)
}

function retryCount (payload) {
  return Number(payload?._retry_count || 0)
}

async function findGeneratePdfEventsByTransactionId (
  transactionId,
  statuses = ['pending', 'failed']
) {
  const numericId = Number(transactionId)

  if (!Number.isInteger(numericId) || numericId < 1) {
    return []
  }

  const rows = await OutboxEvent.findAll({
    where: {
      event_type: EVENTS.GENERATE_PDF,
      status: { [Op.in]: statuses }
    },
    order: [['created_at', 'ASC']]
  })

  return rows.filter(row => payloadTransactionId(row.payload) === numericId)
}

async function dispatchGeneratePdfEvent (event) {
  await eventBus.dispatch(event.event_type, event.payload)
  await OutboxRepository.markProcessed(event.id)
}

async function failGeneratePdfEvent (event, error) {
  const message = error?.message || String(error)
  const nextPayload = {
    ...(event.payload || {}),
    _retry_count: retryCount(event.payload) + 1
  }

  await OutboxEvent.update(
    {
      status: 'failed',
      last_error: message,
      payload: nextPayload
    },
    { where: { id: event.id } }
  )

  if (nextPayload._retry_count >= RETRY_MAX_ATTEMPTS) {
    handleGeneratePdfFailure(nextPayload, error).catch(err => {
      console.error('[GeneratePdfFailure] handler error:', err.message)
    })
  }

  return {
    event_id: event.id,
    error: message,
    retry_count: nextPayload._retry_count
  }
}

/**
 * يعالج فوراً كل أحداث GENERATE_PDF المعلّقة/الفاشلة لمعاملة واحدة.
 * يُستدعى قبل إكمال المعاملة أو قبل الدمج النهائي.
 */
async function flushGeneratePdfForTransaction (transactionId) {
  const events = await findGeneratePdfEventsByTransactionId(
    transactionId,
    ['pending', 'failed']
  )

  const results = []

  for (const event of events) {
    if (event.status === 'failed' && retryCount(event.payload) >= RETRY_MAX_ATTEMPTS) {
      results.push({
        event_id: event.id,
        status: 'skipped_max_retries',
        last_error: event.last_error
      })
      continue
    }

    if (event.status === 'failed') {
      await OutboxRepository.resetToPending(event.id)
    }

    try {
      await dispatchGeneratePdfEvent(event)
      results.push({ event_id: event.id, status: 'processed' })
    } catch (error) {
      results.push(await failGeneratePdfEvent(event, error))
    }
  }

  return results
}

async function findFailedGeneratePdfForRetry (limit = 20) {
  const rows = await OutboxEvent.findAll({
    where: {
      event_type: EVENTS.GENERATE_PDF,
      status: 'failed'
    },
    order: [['updated_at', 'ASC']],
    limit: 50
  })

  return rows
    .filter(row => retryCount(row.payload) < RETRY_MAX_ATTEMPTS)
    .slice(0, limit)
}

async function retryFailedGeneratePdfEvents () {
  const events = await findFailedGeneratePdfForRetry()
  const results = []

  for (const event of events) {
    await OutboxRepository.resetToPending(event.id)

    try {
      await dispatchGeneratePdfEvent(event)
      results.push({ event_id: event.id, status: 'processed' })
    } catch (error) {
      results.push(await failGeneratePdfEvent(event, error))
    }
  }

  return results
}

module.exports = {
  findGeneratePdfEventsByTransactionId,
  flushGeneratePdfForTransaction,
  retryFailedGeneratePdfEvents,
  failGeneratePdfEvent
}
