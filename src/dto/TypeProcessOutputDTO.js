class TypeProcessOutputDTO {
  constructor(model) {
    const plain =
      model && typeof model.get === 'function'
        ? model.get({ plain: true })
        : model

    this.id = plain?.id
    this.name = plain?.name
    this.is_active = plain?.is_active
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}

module.exports = {
  TypeProcessOutputDTO
}