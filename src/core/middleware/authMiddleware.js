const jwt = require('jsonwebtoken')
const {
  findActiveOrgDeptRoleIdsByUserId,
  findPermissionNamesByOrgDeptRoleIds
} = require('../repositories/userAccessRepository')
const ApiResponder = require('../utils/apiResponder')
const { KEYS, getOrLoad } = require('../cache/apiCacheService')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'

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

    const decoded = jwt.verify(token, JWT_SECRET)

    // جلب الـ ODRs الفعّالة فقط: تعيين مفعّل + دور مفعّل
    const roleIds = await findActiveOrgDeptRoleIdsByUserId(decoded.id)

    if (!roleIds.length) {
      return ApiResponder.forbiddenResponse(
        res,
        'لا يوجد دور فعّال لهذا المستخدم — قد يكون دورك معطّلاً، يرجى مراجعة الإدارة'
      )
    }

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
        orgDeptRoleIds = await findActiveOrgDeptRoleIdsByUserId(userId)
      }

      if (!orgDeptRoleIds.length) {
        return []
      }

      // يفلتر على is_active مجدداً: المعرّفات قد تصل من مستدعٍ خارجي غير مفلتر
      return findPermissionNamesByOrgDeptRoleIds(orgDeptRoleIds)
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
