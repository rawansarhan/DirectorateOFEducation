'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')

const {
  getProcessByIdService
} = require('../../services/internal/processClient')

const processById = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessByIdService(req.params.id)

    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })

  } catch (err) {
    return res.status(404).json({
      success: false,
      message: err.message
    })
  }
})


module.exports = {
  processById
}