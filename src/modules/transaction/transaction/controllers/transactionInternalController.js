'use strict'

const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getById,
  updateStatus,
  updateData
} = require('../services/transactionInternalService')

async function getTransactionByIdController (req, res) {
  try {
    const result = await getById(req.params.id)
    return ApiResponder.okResponse(res, result)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function updateTransactionStatusController (req, res) {
  try {
    const result = await updateStatus(req.params.id, req.body.status)
    return ApiResponder.okResponse(res, result, 'Status updated successfully')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
}

async function updateTransactionDataController (req, res) {
  try {
    const hasWrappedPayload = Object.prototype.hasOwnProperty.call(req.body, 'data')
    const payload = hasWrappedPayload ? req.body.data : req.body
    const expectedVersion = hasWrappedPayload
      ? req.body.expected_version ?? null
      : null

    const result = await updateData(
      req.params.id,
      payload,
      expectedVersion
    )

    return ApiResponder.okResponse(res, result, 'Data updated successfully')
  } catch (err) {
    const status = err.code === 'VERSION_CONFLICT' ? 409 : 400

    return ApiResponder.error(res, {
      message: err.message,
      statusCode: status,
      extra: {
        code: err.code,
        current_version: err.currentVersion,
        expected_version: err.expectedVersion
      }
    })
  }
}

module.exports = {
  updateTransactionDataController,
  updateTransactionStatusController,
  getTransactionByIdController
}
