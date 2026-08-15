'use strict'

function resolveHasAppPin (plain) {
  return Boolean(plain?.pin_hash)
}

class LoginOutputDTO {
  constructor (field) {
    const plain =
      field && typeof field.get === 'function'
        ? field.get({ plain: true })
        : field

    this.id = plain?.id
    this.token = plain?.token
    this.userName = plain?.userName
    this.email = plain?.email
    this.phone_number = plain?.phone_number
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
    // مصدر الحقيقة للفرونت: هل الحساب أنشأ PIN على السيرفر؟
    // true بعد setup-pin / تسجيل موظف بـ pin — false بعد delete-pin أو قبل الإنشاء
    this.has_app_pin = resolveHasAppPin(plain)
  }
}

module.exports = {
  LoginOutputDTO,
  resolveHasAppPin
}
