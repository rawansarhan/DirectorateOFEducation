'use strict'

const { Op } = require('sequelize')
const {
  Organization,
  Department,
  Role,
  OrgDeptRole
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

async function searchOrganizations (q, { limit, cursor = null } = {}) {
  const and = [{ name: likeContains(q) }]
  const cursorWhere = nameIdCursorWhere(cursor, 'org')
  if (cursorWhere) and.push(cursorWhere)

  const rows = await Organization.findAll({
    where: { [Op.and]: and },
    attributes: ['id', 'name', 'parent_id', 'location_id'],
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

async function searchDepartments (q, { limit, cursor = null, organizationId, isActive } = {}) {
  const and = [{ name: likeContains(q) }]

  if (organizationId) {
    and.push({ organization_id: Number(organizationId) })
  }

  if (isActive != null) {
    and.push({ is_active: Boolean(isActive) })
  }

  const cursorWhere = nameIdCursorWhere(cursor, 'dept')
  if (cursorWhere) and.push(cursorWhere)

  const rows = await Department.findAll({
    where: { [Op.and]: and },
    attributes: ['id', 'name', 'organization_id', 'parent_id', 'is_active'],
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name'],
        required: false
      }
    ],
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
}

/**
 * يبحث في أدوار مرتبطة بالهيكل (ODR) بالاسم أو الرمز.
 */
async function searchRoles (q, { limit, cursor = null, organizationId, isActive } = {}) {
  const odrWhere = {}
  if (organizationId) {
    odrWhere.organization_id = Number(organizationId)
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
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Department,
        as: 'department',
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

module.exports = {
  searchOrganizations,
  searchDepartments,
  searchRoles
}
