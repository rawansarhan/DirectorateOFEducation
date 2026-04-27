class RegisterEmpOutputDTO {
  constructor (user, roles = []) {
    const plain =
      user && typeof user.get === 'function'
        ? user.get({ plain: true })
        : user

    this.id = plain?.id
    this.userName = plain?.userName
    this.email = plain?.email
    this.phone_number = plain?.phone_number
    this.roles = roles
    this.created_at = plain?.created_at
    this.updated_at = plain?.updated_at
  }
}
module.exports = {
  RegisterEmpOutputDTO
}