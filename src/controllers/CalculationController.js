'use strict'

const asyncHandler = require('../middleware/asyncHandler')
const {
  createCalculationService,
  updateCalculationService,
  getAllCalculationsService
} = require('../services/calculation')

const createCalculation = asyncHandler(async (req, res) => {
  const calculationData = req.body
  const newCalculation = await createCalculationService(calculationData)
  return res.status(200).json({
    message: 'تم انشاء العملية الحسابية بنجاح !',
    data: newCalculation
  })
})

const updateCalculation = asyncHandler(async (req, res) => {
  const calculationData = req.body
  const calculationId = req.params.id
  const updated = await updateCalculationService(calculationData, calculationId)
  return res.status(200).json({
    message: 'تم تعديل العملية الحسابية بنجاح !',
    data: updated
  })
})

const getAllcalculations = asyncHandler(async (req, res) => {
  const calculations = await getAllCalculationsService()
  return res.status(200).json({
    message: 'عرض كل العمليات الحسابية بنجاح !',
    data: calculations
  })
})

module.exports = {
  createCalculation,
  updateCalculation,
  getAllcalculations
}
