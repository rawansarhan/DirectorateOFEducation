const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const ApiResponder = require('../utils/apiResponder');
const sequelize = require('../config/database');
const dotenv = require('dotenv');
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_key';

/**
 * يتحقق من أن للمستخدم صلاحية عبر أدواره النشطة.
 * ترتيب الـ JOIN يتوافق مع الفهارس:
 * - permissions.name (UNIQUE)
 * - role_permissions(permission_id)
 * - organization_department_roles(role_id)
 * - user_role_assignments الجزئي (user_id) WHERE is_active = true
 */
async function userHasPermission (userId, permissionName) {
  const rows = await sequelize.query(
    `
    SELECT 1 AS ok
    FROM permissions p
    INNER JOIN role_permissions rp ON rp.permission_id = p.id
    INNER JOIN organization_department_roles odr ON odr.role_id = rp.role_id
      AND (odr.is_active = true OR odr.is_active IS NULL)
    INNER JOIN user_role_assignments ura
      ON ura.organization_department_role_id = odr.id
      AND ura.user_id = :userId
      AND ura.is_active = true
      AND (ura.end_date IS NULL OR ura.end_date > NOW())
    WHERE p.name = :permissionName
    LIMIT 1
    `,
    {
      replacements: { userId, permissionName },
      type: QueryTypes.SELECT
    }
  );

  return rows.length > 0;
}

const authMiddlewaree = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Authorization Header:', authHeader);

  const token = authHeader?.replace('Bearer ', '');
  console.log('Extracted Token:', token);

  if (!token) {
    return ApiResponder.unauthorizedResponse(res, 'No token provided');
  }

  console.log('AUTH SECRET_KEY:', SECRET_KEY);

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('Decoded Token:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponder.unauthorizedResponse(res, 'Token has expired');
    }
    return ApiResponder.unauthorizedResponse(res, 'Invalid token');
  }
};

/**
 * يُستخدم بعد authMiddlewaree. يمرّر الطلب فقط إذا كان أحد أدوار المستخدم (عبر التعيين) يملك هذه الصلاحية.
 * مثال: router.get('/x', authMiddlewaree, hasPermission('reports.view'), handler)
 */
const hasPermission = (permissionName) => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (userId == null) {
      return ApiResponder.unauthorizedResponse(res, 'Invalid token payload');
    }

    const allowed = await userHasPermission(userId, permissionName);
    if (!allowed) {
      return ApiResponder.forbiddenResponse(res, 'You do not have permission for this action');
    }

    next();
  } catch (err) {
    console.error(err);
    return ApiResponder.errorResponse(res, err.message || 'Permission check failed');
  }
};

module.exports = {
  authMiddlewaree,
  hasPermission,
  userHasPermission
};
