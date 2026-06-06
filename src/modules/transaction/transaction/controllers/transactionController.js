'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  UpdateDraft,
  createDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction
} = require('../services/transactionService')

async function createDraftController (req, res) {
  try {
    const result = await createDraft({
      userId: req.user.id,
      processId: req.params.processId
    })

    return ApiResponder.okResponse(res, result, 'تمت العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function updateDraftController (req, res) {
  try {
    const result = await UpdateDraft({
      transId: req.params.transId,
      data: req.body
    })

    return ApiResponder.okResponse(res, result, 'تم حفظ المسودة بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function getUserDraftByProcessController (req, res) {
  try {
    const result = await getUserDraftByProcess(
      req.user.id,
      req.params.processId
    )

    return ApiResponder.okResponse(res, result, 'تم جلب المسودة بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function getTransactionController (req, res) {
  try {
    const result = await getTransactionById(
      req.params.transactionId,
      req.user.id
    )

    return ApiResponder.okResponse(res, result, 'تمت العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function submitTransactionController (req, res) {
  try {
    const result = await submitTransaction(
      req.params.transactionId,
      req.body
    )

    return ApiResponder.okResponse(res, result, 'تمت العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

module.exports = {
  createDraftController,
  updateDraftController,
  UpdateDraftController: updateDraftController,
  getUserDraftByProcessController,
  getTransactionController,
  submitTransactionController
}
