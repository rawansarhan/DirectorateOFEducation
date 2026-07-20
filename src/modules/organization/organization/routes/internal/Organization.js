const express = require('express')
const router = express.Router()

const {getOrganizationById} = require('../../controllers/internal/organizationController')

router.get(
  '/:id',
  getOrganizationById
)

module.exports = router