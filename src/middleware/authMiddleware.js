const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const {
  UserRoleAssignment,
  RolePermission,
  Permission
} = require('../entities')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'

/* ================= AUTH MIDDLEWARE ================= */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
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
      return res.status(403).json({ message: 'User has no roles' })
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
      return res.status(401).json({ message: 'Token expired' })
    }

    return res.status(401).json({ message: 'Invalid token' })
  }
}

/* ================= AUTHORIZE MIDDLEWARE ================= */
function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      const user = req.user

      console.log("STEP 1 - USER:", user)

      if (!user?.id) {
        console.log("❌ No user found")
        return res.status(401).json({ message: 'Unauthorized' })
      }

      // ================= STEP 2 =================
      const userAssignments = await UserRoleAssignment.findAll({
        where: { user_id: user.id }
      })

      console.log("STEP 2 - userAssignments:", userAssignments)

      if (!userAssignments.length) {
        return res.status(403).json({ message: 'User has no roles' })
      }

      // ================= STEP 3 =================
      const roleIds = userAssignments.map(
        r => r.organization_department_roles_id
      )

      console.log("STEP 3 - roleIds:", roleIds)

      if (!roleIds.length) {
        return res.status(403).json({ message: 'No role IDs found' })
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
        return res.status(403).json({ message: 'No permissions found' })
      }

      // ================= STEP 5 =================
      const permissionNames = rolePermissions
        .map(r => r.permissions?.name)
        .filter(Boolean)

      console.log("STEP 5 - permissionNames:", permissionNames)

      if (!permissionNames.includes(requiredPermission)) {
        return res.status(403).json({
          message: 'Forbidden - missing permission'
        })
      }

      console.log("✅ AUTH SUCCESS")

      next()
    } catch (err) {
      console.error("🔥 AUTH ERROR:")
      console.error(err)

      return res.status(500).json({
        message: 'Authorization error',
        error: err.message
      })
    }
  }
}

module.exports = {
  authMiddleware,
  authorize
}