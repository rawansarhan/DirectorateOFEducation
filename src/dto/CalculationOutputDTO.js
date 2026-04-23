'use strict'

/**
 * شكل الاستجابة بعد إنشاء/قراءة عملية حسابية.
 */
class CreateCalculationOutputDTO {
  constructor (calculation) {
    const plain =
      calculation && typeof calculation.get === 'function'
        ? calculation.get({ plain: true })
        : calculation

    this.id = plain?.id
    this.name = plain?.name
    this.formula = plain?.formula
    this.result_field = plain?.result_field
    this.version = plain?.version
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  CreateCalculationOutputDTO
}
