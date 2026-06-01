const {

  UpdateDraft,

  createDraft,

  getUserDraftByProcess,

  getTransactionById,

  submitTransaction

} = require('../services/transactionService')

const { getClientMeta } = require('../../../core/security/securityConfig')

const { respondIfOperationGuardError } = require('../../../core/security/securityResponseHelper')

function handleTransactionError (res, err, defaultStatus = 400) {
  if (respondIfOperationGuardError(res, err)) {
    return
  }

  return res.status(defaultStatus).json({
    success: false,
    message: err.message
  })
}

// ======================================================
// CREATE E DRAFT
// ======================================================

async function createDraftController(
  req,
  res,
  next
) {

  try {

    const userId =
      req.user.id

    const {
      processId
    } = req.params

    const result =
      await createDraft({
        userId,

        processId
      })

    return res.status(200).json({

      success: true,
      message:'تمت العملية بنجاح',
      data: result
    
    })

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
}

// ======================================================
// CREATE OR UPDATE DRAFT
// ======================================================

async function UpdateDraftController(
  req,
  res,
  next
) {

  try {
    const {
      transId
    } = req.params

    const userId = req.user.id

    const result =
      await UpdateDraft({
        transId,
        userId,
        data: req.body
      })

    return res.status(200).json({

      success: true,
      message:'تم حفظ المسودة بنجاح',
      data: result
    
    })

  } catch (err) {
    const status = err.code === 'VERSION_CONFLICT' ? 409 : 400

    return res.status(status).json({
      success: false,
      message: err.message,
      code: err.code || undefined,
      current_version: err.currentVersion,
      expected_version: err.expectedVersion
    })}
}
// ======================================================
// GET USER DRAFT BY PROCESS
// ======================================================

async function getUserDraftByProcessController(
  req,
  res,
  next
) {

  try {

    const userId =
      req.user.id

    const {
      processId
    } = req.params

    const result =
      await getUserDraftByProcess(

        userId,

        processId
      )

    return res.status(200).json({

       success: true,
      message:'تم جلب المسودة بنجاح',
      data: result
    })

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
}

// ======================================================
// GET TRANSACTION BY ID
// ======================================================

async function getTransactionController(
  req,
  res,
  next
) {

  try {

    const userId =
      req.user.id

    const {
      transactionId
    } = req.params

    const result =
      await getTransactionById(

        transactionId,

        userId
      )

    return res.status(200).json({

      success: true,
      message:'تم العملية بنجاح',
      data: result
    })

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })}
}

// ======================================================
// SUBMIT TRANSACTION
// ======================================================

async function submitTransactionController(
  req,
  res,
  next
) {

  try {

    const {
      transactionId
    } = req.params

    const userId = req.user.id

    const result =
      await submitTransaction(
        transactionId,
        req.body,
        userId,
        getClientMeta(req)
      )

    return res.status(200).json({

      success: true,
      message: result.idempotent_replay
        ? 'تم إرسال المعاملة مسبقاً'
        : 'تم العملية بنجاح',
      data: result,
      idempotent_replay: Boolean(result.idempotent_replay)
    })

  } catch (err) {
    return handleTransactionError(res, err)
  }}






    module.exports = {

  createDraftController,

  UpdateDraftController,

  getUserDraftByProcessController,

  getTransactionController,

  submitTransactionController,


}