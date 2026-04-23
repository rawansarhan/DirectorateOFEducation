'use strict'

/**
 * شكل البيانات المقبولة لإنشاء عملية حسابية (قبل الحفظ في DB).
 */
class CreateCalculationInputDTO {
  constructor ({ name, formula, result_field }) {
    this.name = name
    this.formula = formula
    this.result_field = result_field ?? null
  }
}

module.exports = {
  CreateCalculationInputDTO
}
