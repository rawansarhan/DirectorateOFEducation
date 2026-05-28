const express = require('express')
const router = express.Router()

const {
  getOrgDeptRoleById,
  getActiveRoles,
  getOrgDeptRolesByIds,
  findOneOrgDeptRole,
  getCitizenRole
} = require('../../controllers/internal/OrgDeptRoleController')

// =====================================
// GET ACTIVE
// =====================================
router.get(
  '/active',
  getActiveRoles
)

// =====================================
// CITIZEN ROLE
// =====================================
router.get(
  '/citizen',
  getCitizenRole
)

// =====================================
// GET BY ID
// =====================================
router.get(
  '/:id',
  getOrgDeptRoleById
)

// =====================================
// FIND ONE (by composite keys)
// =====================================
router.post(
  '/find',
  findOneOrgDeptRole
)

// =====================================
// BULK FIND
// =====================================
router.post(
  '/bulk',
  getOrgDeptRolesByIds
)

module.exports = router