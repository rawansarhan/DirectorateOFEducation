'use strict'

const { Op } = require('sequelize')
const {
  Department,
  Role,
  OrgDeptRole,
  Organization,
  User,
  UserRoleAssignment
} = require('../../../../entities')
const { likeContains } = require('../../../../core/utils/escapeLike')

function nameIdCursorWhere (cursor, kind) {
  if (cursor?.k !== kind || typeof cursor.n !== 'string' || !Number.isFinite(Number(cursor.id))) {
    return null
  }

  const cursorName = cursor.n
  const cursorId = Number(cursor.id)

  return {
    [Op.or]: [
      { name: { [Op.gt]: cursorName } },
      {
        name: cursorName,
        id: { [Op.gt]: cursorId }
      }
    ]
  }
}

/**
 * أشكال بحث اسم الموظف (نفس منطق المعاملات تقريباً).
 */
function buildEmployeeNameOrConditions (rawQuery) {
  const tokens = String(rawQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)

  if (!tokens.length) return []

  if (tokens.length === 1) {
    const like = likeContains(tokens[0])
    return [
      { first_name: like },
      { last_name: like },
      { father_name: like },
      { mother_name: like },
      { national_id: like },
      { userName: like }
    ]
  }

  if (tokens.length === 2) {
    const [a, b] = tokens
    return [
      { [Op.and]: [{ first_name: likeContains(a) }, { last_name: likeContains(b) }] },
      { [Op.and]: [{ first_name: likeContains(a) }, { father_name: likeContains(b) }] },
      { [Op.and]: [{ first_name: likeContains(b) }, { last_name: likeContains(a) }] }
    ]
  }

  const [a, b, c] = tokens
  return [
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { father_name: likeContains(b) },
        { last_name: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { last_name: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { father_name: likeContains(b) }
      ]
    }
  ]
}

async function searchDepartments (q, { limit, cursor = null, organizationId, isActive } = {}) {
  const and = [
    { organization_id: Number(organizationId) },
    { name: likeContains(q) }
  ]

  if (isActive != null) {
    and.push({ is_active: Boolean(isActive) })
  }

  const cursorWhere = nameIdCursorWhere(cursor, 'dept')
  if (cursorWhere) and.push(cursorWhere)

  const rows = await Department.findAll({
    where: { [Op.and]: and },
    attributes: ['id', 'name', 'organization_id', 'parent_id', 'is_active'],
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

/**
 * OrgDeptRole ضمن مؤسسة — مطابقة role.name أو role.code
 */
async function searchRoles (q, { limit, cursor = null, organizationId, isActive } = {}) {
  const odrWhere = {
    organization_id: Number(organizationId)
  }

  if (isActive != null) {
    odrWhere.is_active = Boolean(isActive)
  } else {
    odrWhere.is_active = true
  }

  if (cursor?.k === 'odr' && Number.isFinite(Number(cursor.id))) {
    odrWhere.id = { [Op.gt]: Number(cursor.id) }
  }

  const rows = await OrgDeptRole.findAll({
    where: odrWhere,
    attributes: [
      'id',
      'role_id',
      'organization_id',
      'department_id',
      'camunda_group_key',
      'is_active'
    ],
    include: [
      {
        model: Role,
        as: 'role',
        required: true,
        attributes: ['id', 'name', 'code'],
        where: {
          [Op.or]: [
            { name: likeContains(q) },
            { code: likeContains(q) }
          ]
        }
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name'],
        required: false
      }
    ],
    order: [['id', 'ASC']],
    limit: limit + 1,
    distinct: true,
    subQuery: false
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

/**
 * موظفو مؤسسة (غير مواطنين) — بحث بالاسم / الأب / الأم / الوطني / الثلاثي
 */
async function searchEmployees (q, { limit, cursor = null, organizationId, isActive } = {}) {
  const userAnd = [{ [Op.or]: buildEmployeeNameOrConditions(q) }]

  if (isActive != null) {
    userAnd.push({ is_active: Boolean(isActive) })
  }

  if (cursor?.k === 'emp' && Number.isFinite(Number(cursor.id))) {
    userAnd.push({ id: { [Op.gt]: Number(cursor.id) } })
  }

  const odrWhere = {
    organization_id: Number(organizationId),
    camunda_group_key: { [Op.ne]: 'CITIZEN' }
  }
  if (isActive != null) {
    odrWhere.is_active = Boolean(isActive)
  } else {
    odrWhere.is_active = true
  }

  const rows = await User.findAll({
    where: { [Op.and]: userAnd },
    attributes: [
      'id',
      'userName',
      'email',
      'first_name',
      'last_name',
      'father_name',
      'mother_name',
      'national_id',
      'is_active'
    ],
    include: [
      {
        model: UserRoleAssignment,
        as: 'role_assignments',
        required: true,
        where: { is_active: true },
        attributes: ['id', 'organization_department_roles_id'],
        include: [
          {
            model: OrgDeptRole,
            as: 'org_department_role',
            required: true,
            where: odrWhere,
            attributes: ['id', 'organization_id', 'department_id', 'role_id', 'camunda_group_key'],
            include: [
              { model: Role, as: 'role', attributes: ['id', 'name', 'code'] },
              { model: Department, as: 'department', attributes: ['id', 'name'] }
            ]
          }
        ]
      }
    ],
    order: [['id', 'ASC']],
    limit: limit + 1,
    distinct: true,
    subQuery: false
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

module.exports = {
  searchDepartments,
  searchRoles,
  searchEmployees,
  buildEmployeeNameOrConditions
}
