const authClientService =
  require('../../services/internal/authClientService')
const ApiResponder = require('../../../../core/utils/apiResponder')

async function getUserRoleIds(req, res, next) {

  try {

    const { userId } = req.params

    const data =
      await authClientService.getUserRoleIds(
        userId
      )

    ApiResponder.okResponse(res, data, 'success')

  } catch (err) {
    next(err)
  }
}

module.exports = {
  getUserRoleIds
}