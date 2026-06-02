const {
  getById,
  updateStatus,
  updateData
} = require('../services/transactionClient')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')

async function getTransactionByIdController (req, res) {
  try {
    const result = await getById(req.params.id)
    return sendOk(res, result, 'تم جلب المعاملة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function updateTransactionStatusController (req, res) {
  try {
    const result = await updateStatus(req.params.id, req.body.status)
    return sendOk(res, result, 'Status updated successfully')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function updateTransactionDataController (req, res) {
  try {
    const hasWrappedPayload = Object.prototype.hasOwnProperty.call(req.body, 'data')
    const payload = hasWrappedPayload ? req.body.data : req.body
    const expectedVersion = hasWrappedPayload
      ? req.body.expected_version ?? null
      : null

    const result = await updateData(req.params.id, payload, expectedVersion)
    return sendOk(res, result, 'Data updated successfully')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

module.exports = {
  updateTransactionDataController,
  updateTransactionStatusController,
  getTransactionByIdController
}
