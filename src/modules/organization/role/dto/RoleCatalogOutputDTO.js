'use strict'

/**
 * صف من جدول `roles` مجرّداً عن أي ربط بمؤسسة أو قسم.
 * يُستخدم لملء قائمة اختيار الدور عند إنشاء سجل ربط جديد.
 */
class RoleCatalogOutputDTO {
  constructor (row) {
    const plain = row && typeof row.get === 'function'
      ? row.get({ plain: true })
      : (row || {})

    this.id = plain.id
    this.name = plain.name
    this.code = plain.code
  }
}

module.exports = {
  RoleCatalogOutputDTO
}
