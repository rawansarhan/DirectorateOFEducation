const ApiResponder = require('../../../core/utils/apiResponder')

const {

  UpdateDraft,

  createDraft,

  getUserDraftByProcess,

  getTransactionById,

  submitTransaction

} = require('../services/transactionService')

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

    return ApiResponder.okResponse(res, result, 'تمت العملية بنجاح')

  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
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

    const result =
      await UpdateDraft({
        transId,

        data: req.body
      })

    return ApiResponder.okResponse(res, result, 'تم حفظ المسودة بنجاح')

  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
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

    return ApiResponder.okResponse(res, result, 'تم جلب المسودة بنجاح')

  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
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

    return ApiResponder.okResponse(res, result, 'تم العملية بنجاح')

  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
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

    const result =
      await submitTransaction(

        transactionId,

        req.body
      )

    return ApiResponder.okResponse(res, result, 'تم العملية بنجاح')

  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)}
}





    module.exports = {

  createDraftController,

  UpdateDraftController,

  getUserDraftByProcessController,

  getTransactionController,

  submitTransactionController,


}