const authClientService =
  require('../../services/internal/authClientService')

async function getUserRoleIds(req, res, next) {

  try {

    const { userId } = req.params

    const data =
      await authClientService.getUserRoleIds(
        userId
      )

    res.status(200).json({
      message: 'success',
      data
    })

  } catch (err) {
    next(err)
  }
}

module.exports = {
  getUserRoleIds
}