const jwt = require('jsonwebtoken')
const {
  UserRoleAssignment,
  RolePermission,
  Permission
} = require('../../entities')
const ApiResponder = require('../utils/apiResponder')
const { KEYS, getOrLoad } = require('../cache/apiCacheService')
const { JWT_ACCESS_SECRET } = require('../config/env')

// TTL قصير: مساعدة سريعة لـ authorize دون إبقاء صلاحيات قديمة طويلاً بعد التعديل
const USER_PERMISSIONS_TTL_SECONDS = 90

/* ================= AUTH MIDDLEWARE ================= */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponder.unauthorizedResponse(res, 'No token provided')
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET)

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

async function loadUserPermissionNames (userId, roleIds = []) {
  return getOrLoad(
    KEYS.userPermissions(userId),
    async () => {
      let orgDeptRoleIds = Array.isArray(roleIds) ? roleIds.filter(Boolean) : []

      if (!orgDeptRoleIds.length) {
        const assignments = await UserRoleAssignment.findAll({
          where: { user_id: userId },
          attributes: ['organization_department_roles_id']
        })
        orgDeptRoleIds = assignments.map(
          row => row.organization_department_roles_id
        )
      }

      if (!orgDeptRoleIds.length) {
        return []
      }

      const rolePermissions = await RolePermission.findAll({
        where: {
          organization_department_roles_id: orgDeptRoleIds
        },
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['name'],
            required: true
          }
        ]
      })

      return [
        ...new Set(
          rolePermissions
            .map(row => row.permissions?.name)
            .filter(Boolean)
        )
      ]
    },
    {
      label: `auth.user-permissions:${userId}`,
      ttlSeconds: USER_PERMISSIONS_TTL_SECONDS
    }
  )
}

/* ================= AUTHORIZE MIDDLEWARE ================= */
function authorize (requiredPermission) {
  return async (req, res, next) => {
    try {
      const user = req.user

      if (!user?.id) {
        return ApiResponder.unauthorizedResponse(res, 'Unauthorized')
      }

      const permissionNames = await loadUserPermissionNames(
        user.id,
        user.roles
      )

      if (!permissionNames.includes(requiredPermission)) {
        return ApiResponder.forbiddenResponse(
          res,
          'Forbidden - missing permission'
        )
      }

      next()
    } catch (err) {
      console.error('AUTH ERROR:', err)
      return ApiResponder.errorResponse(
        res,
        err.message || 'Authorization error',
        500
      )
    }
  }
}

module.exports = {
  authMiddleware,
  authorize,
  loadUserPermissionNames
}
