const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const {
  UserRoleAssignment,
  RolePermission,
  Permission
} = require('../../entities')

const { JWT_SECRET } = require('../config/env')
const ApiResponder = require('../utils/apiResponder')

/* ================= AUTH MIDDLEWARE ================= */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponder.unauthorizedResponse(res, 'No token provided', 'NO_TOKEN')
    }

    const token = authHeader.split(' ')[1]

    console.log("TOKEN RECEIVED:", token)

    const decoded = jwt.verify(token, JWT_SECRET)

    // جلب كل الـ roles الخاصة بالمستخدم
    const userAssignments = await UserRoleAssignment.findAll({
      where: { user_id: decoded.id },
      attributes: ['organization_department_roles_id']
    })

    if (!userAssignments.length) {
      return ApiResponder.forbiddenResponse(res, 'User has no roles', 'NO_ROLES')
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
      return ApiResponder.unauthorizedResponse(res, 'Token expired', 'TOKEN_EXPIRED')
    }

    return ApiResponder.unauthorizedResponse(res, 'Invalid token', 'INVALID_TOKEN')
  }
}

/* ================= AUTHORIZE MIDDLEWARE ================= */
function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      const user = req.user

      console.log("STEP 1 - USER:", user)

      if (!user?.id) {
        return ApiResponder.unauthorizedResponse(res, 'Unauthorized', 'UNAUTHORIZED')
      }

      // ================= STEP 2 =================
      const userAssignments = await UserRoleAssignment.findAll({
        where: { user_id: user.id }
      })

      console.log("STEP 2 - userAssignments:", userAssignments)

      if (!userAssignments.length) {
        return ApiResponder.forbiddenResponse(res, 'User has no roles', 'NO_ROLES')
      }

      // ================= STEP 3 =================
      const roleIds = userAssignments.map(
        r => r.organization_department_roles_id
      )

      console.log("STEP 3 - roleIds:", roleIds)

      if (!roleIds.length) {
        return ApiResponder.forbiddenResponse(res, 'No role IDs found', 'NO_ROLE_IDS')
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

      console.log("STEP 4 - rolePermissions:", JSON.stringify(rolePermissions, null, 2))

      if (!rolePermissions.length) {
        return ApiResponder.forbiddenResponse(res, 'No permissions found', 'NO_PERMISSIONS')
      }

      // ================= STEP 5 =================
      const permissionNames = rolePermissions
        .map(r => r.permissions?.name)
        .filter(Boolean)

      console.log("STEP 5 - permissionNames:", permissionNames)

      if (!permissionNames.includes(requiredPermission)) {
        return ApiResponder.forbiddenResponse(
          res,
          'Forbidden - missing permission',
          'FORBIDDEN'
        )
      }

      console.log("✅ AUTH SUCCESS")

      next()
    } catch (err) {
      console.error("🔥 AUTH ERROR:")
      console.error(err)

      return ApiResponder.errorResponse(
        res,
        'Authorization error',
        500,
        err.message
      )
    }
  }
}

module.exports = {
  authMiddleware,
  authorize
}