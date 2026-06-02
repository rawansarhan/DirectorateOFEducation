const {
  UpdateDraft,
  createDraft,
  getUserDraftByProcess,
  getTransactionById,
  submitTransaction
} = require('../services/transactionService')
const { getClientMeta } = require('../../../core/security/securityConfig')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')

async function createDraftController (req, res) {
  try {
    const result = await createDraft({
      userId: req.user.id,
      processId: req.params.processId
    })

    return sendOk(res, result, 'تمت العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function UpdateDraftController (req, res) {
  try {
    const result = await UpdateDraft({
      transId: req.params.transId,
      userId: req.user.id,
      data: req.body
    })

    return sendOk(res, result, 'تم حفظ المسودة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function getUserDraftByProcessController (req, res) {
  try {
    const result = await getUserDraftByProcess(req.user.id, req.params.processId)
    return sendOk(res, result, 'تم جلب المسودة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function getTransactionController (req, res) {
  try {
    const result = await getTransactionById(req.params.transactionId, req.user.id)
    return sendOk(res, result, 'تم العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

async function submitTransactionController (req, res) {
  try {
    const result = await submitTransaction(
      req.params.transactionId,
      req.body,
      req.user.id,
      getClientMeta(req)
    )

    return sendOk(
      res,
      {
        ...result,
        idempotent_replay: Boolean(result.idempotent_replay)
      },
      result.idempotent_replay
        ? 'تم إرسال المعاملة مسبقاً'
        : 'تم العملية بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
}

module.exports = {
  createDraftController,
  UpdateDraftController,
  getUserDraftByProcessController,
  getTransactionController,
  submitTransactionController
}
