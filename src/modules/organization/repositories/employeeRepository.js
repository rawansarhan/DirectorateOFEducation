'use strict'

const { Op } = require('sequelize')
const {
  User,
  UserRoleAssignment,
  OrgDeptRole,
  Organization,
  Department,
  Role,
  UserKey
} = require('../../../entities')

// الحقول العامة للموظف التي تُرجَع في القوائم/التفاصيل (بدون password / pin_hash)
const PUBLIC_USER_ATTRIBUTES = [
  'id',
  'userName',
  'email',
  'phone_number',
  'first_name',
  'last_name',
  'father_name',
  'mother_name',
  'national_id',
  'is_active',
  'created_at',
  'updated_at'
]

// include يجلب الدور/القسم/المؤسسة للموظف عبر تعيينات الأدوار الفعّالة.
// نستبعد المواطنين عبر camunda_group_key (CITIZEN ليس موظفاً).
function buildRoleInclude ({ requireEmployee = true } = {}) {
  return {
    model: UserRoleAssignment,
    as: 'role_assignments',
    required: requireEmployee,
    where: { is_active: true },
    include: [
      {
        model: OrgDeptRole,
        as: 'org_department_role',
        required: requireEmployee,
        where: requireEmployee
          ? { camunda_group_key: { [Op.ne]: 'CITIZEN' } }
          : undefined,
        include: [
          { model: Role, as: 'role', attributes: ['id', 'name', 'code'] },
          { model: Organization, as: 'organization', attributes: ['id', 'name'] },
          { model: Department, as: 'department', attributes: ['id', 'name'] }
        ]
      }
    ]
  }
}

// جلب الموظفين فقط (باستثناء المواطنين) مع ترقيم صفحات وبحث.
// يُرجع { rows, count } — count هو إجمالي الموظفين المطابقين للبحث.
async function findAllEmployees ({ limit, offset, search } = {}) {
  const where = {}

  if (search) {
    const like = { [Op.iLike]: `%${search}%` }
    where[Op.or] = [
      { userName: like },
      { email: like },
      { first_name: like },
      { last_name: like },
      { national_id: like }
    ]
  }

  // distinct + subQuery:false ضروريان لصحّة العدّ مع include على hasMany.
  return User.findAndCountAll({
    where,
    attributes: PUBLIC_USER_ATTRIBUTES,
    include: [buildRoleInclude({ requireEmployee: true })],
    order: [['id', 'ASC']],
    limit,
    offset,
    distinct: true,
    subQuery: false
  })
}

// جلب موظف واحد بكامل علاقاته (الدور/القسم/المؤسسة + المفتاح العام الفعّال).
async function findEmployeeById (id) {
  return User.findByPk(id, {
    attributes: PUBLIC_USER_ATTRIBUTES,
    include: [
      buildRoleInclude({ requireEmployee: false }),
      {
        model: UserKey,
        as: 'keys',
        required: false,
        where: { is_active: true },
        attributes: ['id', 'key_fingerprint', 'algorithm', 'is_active', 'created_at']
      }
    ]
  })
}

// نسخة خام (instance) للتعديل — بكل الحقول كي نتمكّن من user.update().
async function findRawById (id, options = {}) {
  return User.findByPk(id, options)
}

async function findByEmailExcludingId (email, excludeId, options = {}) {
  return User.findOne({
    where: {
      email,
      id: { [Op.ne]: excludeId }
    },
    ...options
  })
}

async function findByUserNameExcludingId (userName, excludeId, options = {}) {
  return User.findOne({
    where: {
      userName,
      id: { [Op.ne]: excludeId }
    },
    ...options
  })
}

async function findByNationalIdExcludingId (nationalId, excludeId, options = {}) {
  return User.findOne({
    where: {
      national_id: nationalId,
      id: { [Op.ne]: excludeId }
    },
    ...options
  })
}

async function updateInstance (user, payload, options = {}) {
  await user.update(payload, options)
  return user
}

function getSequelize () {
  return User.sequelize
}

module.exports = {
  PUBLIC_USER_ATTRIBUTES,
  findAllEmployees,
  findEmployeeById,
  findRawById,
  findByEmailExcludingId,
  findByUserNameExcludingId,
  findByNationalIdExcludingId,
  updateInstance,
  getSequelize
}
