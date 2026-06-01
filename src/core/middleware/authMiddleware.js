const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const {
  UserRoleAssignment,
  RolePermission,
  Permission
} = require('../../entities')
const ApiResponder = require('../utils/apiResponder')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'

/* ================= AUTH MIDDLEWARE ================= */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponder.unauthorizedResponse(res, 'No token provided')
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, JWT_SECRET)

    // جلب كل الـ roles الخاصة بالمستخدم
    const userAssignments = await UserRoleAssignment.findAll({
      where: { user_id: decoded.id },
      attributes: ['organization_department_roles_id']
    })

    if (!userAssignments.length) {
      return ApiResponder.forbiddenResponse(res, 'User has no roles')
    }

    const roleIds = userAssignments.map(
      r => r.organization_department_roles_id
    )

    req.user = {
      id: decoded.id,
      roles: roleIds
    }

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponder.unauthorizedResponse(res, 'Token expired')
    }

    return ApiResponder.unauthorizedResponse(res, 'Invalid token')
  }
}

/* ================= AUTHORIZE MIDDLEWARE ================= */
function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      const user = req.user

      if (!user?.id) {
        return ApiResponder.unauthorizedResponse(res, 'Unauthorized')
      }

      // ================= STEP 2 =================
      const userAssignments = await UserRoleAssignment.findAll({
        where: { user_id: user.id }
      })

      if (!userAssignments.length) {
        return ApiResponder.forbiddenResponse(res, 'User has no roles')
      }

      // ================= STEP 3 =================
      const roleIds = userAssignments.map(
        r => r.organization_department_roles_id
      )

      if (!roleIds.length) {
        return ApiResponder.forbiddenResponse(res, 'No role IDs found')
      }

      // ================= STEP 4 =================
      const rolePermissions = await RolePermission.findAll({
        where: {
          organization_department_roles_id: {
            [Op.in]: roleIds
          }
        },
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['name']
          }
        ]
      })

      if (!rolePermissions.length) {
        return ApiResponder.forbiddenResponse(res, 'No permissions found')
      }

      // ================= STEP 5 =================
      const permissionNames = rolePermissions
        .map(r => r.permissions?.name)
        .filter(Boolean)

      if (!permissionNames.includes(requiredPermission)) {
        return ApiResponder.forbiddenResponse(res, 'Forbidden - missing permission')
      }

      next()
    } catch (err) {
      console.error('AUTH ERROR:', err)
      return ApiResponder.errorResponse(res, err.message || 'Authorization error', 500)
    }
  }
}

module.exports = {
  authMiddleware,
  authorize
}