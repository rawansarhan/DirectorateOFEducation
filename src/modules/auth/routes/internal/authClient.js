const express = require('express')

const router = express.Router()

const {
  getUserRoleIds
} =
  require('../../controllers/internal/authController')

router.get(
  '/:userId/role-ids',
  getUserRoleIds
)

module.exports = router