  const{
  
  getById,

  updateStatus,

  updateData

} = require('../services/transactionClient')
// =====================================
// GET BY ID
// =====================================
async function getTransactionByIdController(
  req,
  res
) {

  try {

    const result =
      await getById(
        req.params.id
      )

    return res.status(200).json({

      success: true,

      data: result
    })

  } catch (err) {

    return res.status(400).json({

      success: false,

      message: err.message
    })
  }
}

// ======================================================
// INTERNAL - UPDATE STATUS
// ======================================================

async function updateTransactionStatusController(
  req,
  res
) {

  try {

    const result =
      await updateStatus(

        req.params.id,

        req.body.status
      )

    return res.status(200).json({

      success: true,

      message:
        'Status updated successfully',

      data: result
    })

  } catch (err) {

    return res.status(400).json({

      success: false,

      message: err.message
    })
  }
}

// ======================================================
// INTERNAL - UPDATE DATA
// ======================================================

async function updateTransactionDataController(
  req,
  res
) {

  try {

    const hasWrappedPayload = Object.prototype.hasOwnProperty.call(req.body, 'data')
    const payload = hasWrappedPayload ? req.body.data : req.body
    const expectedVersion = hasWrappedPayload
      ? req.body.expected_version ?? null
      : null

    const result =
      await updateData(
        req.params.id,
        payload,
        expectedVersion
      )

    return res.status(200).json({

      success: true,

      message:
        'Data updated successfully',

      data: result
    })

  } catch (err) {

    const status = err.code === 'VERSION_CONFLICT' ? 409 : 400

    return res.status(status).json({

      success: false,

      message: err.message,

      code: err.code,

      current_version: err.currentVersion,

      expected_version: err.expectedVersion

    })

  }
}

module.exports = {
  updateTransactionDataController,

  updateTransactionStatusController,

  getTransactionByIdController
}