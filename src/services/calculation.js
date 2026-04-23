'use strict'

const { ValidateCreateCalculation, ValidateUpdateCalculation } = require('../validations/calculationsValidations')
const { Calculation } = require('../entities')
const { CreateCalculationInputDTO } = require('../dto/CalculationInputDTO')
const { CreateCalculationOutputDTO } = require('../dto/CalculationOutputDTO')

//// create calculation : 
async function createCalculationService (calculationData) {
  try {
    const dataToValidate = { ...calculationData }
    const { error } = ValidateCreateCalculation(dataToValidate)
    if (error) throw new Error(error.details[0].message)

    const inputCalculationDTO = new CreateCalculationInputDTO({
      ...calculationData
    })

    const calculation = await Calculation.create({
      ...inputCalculationDTO
    })

    return new CreateCalculationOutputDTO(calculation)
  } catch (err) {
    console.error('=== ERROR in createCalculationService ===')
    console.error(err)
    throw err
  }
}


///// update calculation : 
async function updateCalculationService (calculationData, calculationId) {
  const id = parseInt(calculationId, 10)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('معرّف العملية الحسابية غير صالح')
  }

  const { error } = ValidateUpdateCalculation({ ...calculationData })
  if (error) throw new Error(error.details[0].message)

  const calculation = await Calculation.findByPk(id)
  if (!calculation) {
    const err = new Error('العملية الحسابية غير موجودة')
    err.statusCode = 404
    throw err
  }

  const payload = {}
  if (calculationData.name !== undefined) payload.name = calculationData.name
  if (calculationData.formula !== undefined) payload.formula = calculationData.formula
  if (calculationData.result_field !== undefined) {
    payload.result_field = calculationData.result_field
  }
    payload.version = calculation.version +1


  await calculation.update(payload)
  await calculation.reload()

  return new CreateCalculationOutputDTO(calculation)
}

///// get all calculation : 
async function getAllCalculationsService () {
  const rows = await Calculation.findAll({
    order: [['id', 'ASC']]
  })
  return rows.map(row => new CreateCalculationOutputDTO(row))
}



module.exports = {
  createCalculationService,
  updateCalculationService,
  getAllCalculationsService
}
