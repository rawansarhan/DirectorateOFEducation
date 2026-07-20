'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')
const { createTransactionError } = require('../utils/transactionErrors')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const userRepository = require('../../../auth/shared/repositories/userRepository')
const { hasUpsertFormPayload } = require('../validations/draftFormValidation')
const {
  fetchActiveProcess,
  applyIdentityUpdate,
  applyDraftFormUpdate
} = require('./transactionServiceHelpers')

async function createDraft ({ userId, processId }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)

    if (draft) {
      return {
        isNew: false,
        draft: toDTO(draft)
      }
    }

    draft = await repo.create({
      code: process.code,
      user_id: userId,
      status: 'draft'
    })

    return {
      isNew: true,
      draft: toDTO(draft)
    }
  }, { label: 'transaction.createDraft' })
}

async function ensureDraftForProcess ({ userId, processId }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)

    if (draft) {
      return {
        isNew: false,
        draft,
        process
      }
    }

    const user = await userRepository.findById(userId)

    if (!user || !user.is_active) {
      throw createTransactionError('UNAUTHORIZED')
    }

    draft = await repo.create({
      code: process.code,
      user_id: userId,
      status: 'draft',
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      father_name: user.father_name ?? null,
      mother_name: user.mother_name ?? null,
      national_id: user.national_id ?? null
    })

    return {
      isNew: true,
      draft,
      process
    }
  }, { label: 'transaction.ensureDraftForProcess' })
}

async function UpdateDraft ({ userId, processId, data }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)
    let isNew = false

    if (!draft) {
      draft = await repo.create({
        code: process.code,
        user_id: userId,
        status: 'draft'
      })
      isNew = true
    } else if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
    }

    await applyIdentityUpdate(draft, data, userId)

    const refreshed = await repo.findById(draft.id)

    return {
      isNew,
      draft: toDTO(refreshed)
    }
  }, { label: 'transaction.updateDraft' })
}

async function upsertDraft ({ userId, processId, body = null }) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    let draft = await repo.findDraftByCode(userId, process.code)
    let isNew = false

    if (!draft) {
      draft = await repo.create({
        code: process.code,
        user_id: userId,
        status: 'draft'
      })
      isNew = true
    } else if (draft.user_id !== userId) {
      throw createTransactionError('UNAUTHORIZED')
    }

    if (hasUpsertFormPayload(body)) {
      await applyDraftFormUpdate(draft, body, process.code, userId)
      draft = await repo.findById(draft.id)
    }

    return {
      isNew,
      draft: toDTO(draft)
    }
  }, { label: 'transaction.upsertDraft' })
}

async function getUserDraftByProcess (userId, processId) {
  return retryWithBackoff(async () => {
    const process = await fetchActiveProcess(processId)
    const draft = await repo.findDraftByCode(userId, process.code)

    if (!draft) {
      throw createTransactionError('DRAFT_NOT_FOUND')
    }

    return toDTO(draft)
  }, { label: 'transaction.getUserDraftByProcess' })
}

module.exports = {
  UpdateDraft,
  createDraft,
  upsertDraft,
  ensureDraftForProcess,
  getUserDraftByProcess
}
