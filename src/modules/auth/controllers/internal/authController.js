const authClientService = require('../../services/internal/authClientService')
const { sendOk, sendControllerError } = require('../../../../core/utils/controllerResponse')

async function getUserRoleIds (req, res) {
  try {
    const data = await authClientService.getUserRoleIds(req.params.userId)
    return sendOk(res, data, 'success')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

module.exports = {
  getUserRoleIds
}
