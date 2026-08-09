'use strict'

const structureSearchRepository = require('../repositories/structureSearchRepository')
const {
  validateStructureSearchQuery
} = require('../validations/structureSearchValidation')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')
const { createHttpError, HTTP_STATUS } = require('../../../../core/middleware/httpStatusCodes')

function mapOrg (row) {
  const p = row.get ? row.get({ plain: true }) : row
  return {
    kind: 'organization',
    id: p.id,
    name: p.name,
    parent_id: p.parent_id ?? null,
    location_id: p.location_id ?? null
  }
}

function mapDept (row) {
  const p = row.get ? row.get({ plain: true }) : row
  return {
    kind: 'department',
    id: p.id,
    name: p.name,
    organization_id: p.organization_id,
    organization_name: p.organization?.name ?? null,
    parent_id: p.parent_id ?? null,
    is_active: Boolean(p.is_active)
  }
}

function mapRole (row) {
  const p = row.get ? row.get({ plain: true }) : row
  return {
    kind: 'role',
    id: p.role?.id ?? p.role_id,
    odr_id: p.id,
    name: p.role?.name ?? null,
    code: p.role?.code ?? null,
    organization_id: p.organization_id,
    organization_name: p.organization?.name ?? null,
    department_id: p.department_id,
    department_name: p.department?.name ?? null,
    camunda_group_key: p.camunda_group_key ?? null,
    is_active: Boolean(p.is_active)
  }
}

function buildNameCursor (kind, row) {
  const p = row.get ? row.get({ plain: true }) : row
  if (typeof p.name !== 'string' || !Number.isFinite(Number(p.id))) return null
  return encodeCursor({ k: kind, n: p.name, id: Number(p.id) })
}

function buildOdrCursor (row) {
  const p = row.get ? row.get({ plain: true }) : row
  if (!Number.isFinite(Number(p.id))) return null
  return encodeCursor({ k: 'odr', id: Number(p.id) })
}

async function searchStructure (query = {}) {
  const { error, value: filters } = validateStructureSearchQuery(query)

  if (error) {
    throw createHttpError(error, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
  }

  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  const common = {
    limit,
    organizationId: filters.organization_id || null,
    isActive: filters.is_active == null ? null : filters.is_active
  }

  // scope=all: ثلاث قوائم قصيرة (typeahead) بدون cursor موحّد
  if (filters.scope === 'all') {
    if (cursor) {
      throw createHttpError(
        'cursor غير مدعوم مع scope=all — استخدم scope محدّد للترقيم',
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      )
    }

    const capped = Math.min(limit, 20)
    const [orgs, depts, roles] = await Promise.all([
      structureSearchRepository.searchOrganizations(filters.q, { limit: capped }),
      structureSearchRepository.searchDepartments(filters.q, {
        ...common,
        limit: capped
      }),
      structureSearchRepository.searchRoles(filters.q, {
        ...common,
        limit: capped
      })
    ])

    return {
      message: 'تم جلب نتائج بحث الهيكل بنجاح',
      data: {
        scope: 'all',
        q: filters.q,
        organizations: orgs.rows.map(mapOrg),
        departments: depts.rows.map(mapDept),
        roles: roles.rows.map(mapRole),
        pagination: {
          limit: capped,
          organizations_has_next: orgs.hasNext,
          departments_has_next: depts.hasNext,
          roles_has_next: roles.hasNext
        }
      }
    }
  }

  const expectedKind =
    filters.scope === 'organization'
      ? 'org'
      : filters.scope === 'department'
        ? 'dept'
        : 'odr'

  if (decodedCursor && decodedCursor.k !== expectedKind) {
    throw createHttpError(
      'cursor غير صالح لهذا النطاق',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    )
  }

  let result
  let mapper
  let buildNext

  if (filters.scope === 'organization') {
    result = await structureSearchRepository.searchOrganizations(filters.q, {
      limit,
      cursor: decodedCursor
    })
    mapper = mapOrg
    buildNext = row => buildNameCursor('org', row)
  } else if (filters.scope === 'department') {
    result = await structureSearchRepository.searchDepartments(filters.q, {
      ...common,
      cursor: decodedCursor
    })
    mapper = mapDept
    buildNext = row => buildNameCursor('dept', row)
  } else {
    result = await structureSearchRepository.searchRoles(filters.q, {
      ...common,
      cursor: decodedCursor
    })
    mapper = mapRole
    buildNext = buildOdrCursor
  }

  if (!result.rows.length) {
    return {
      message: 'تم جلب نتائج بحث الهيكل بنجاح',
      data: {
        scope: filters.scope,
        q: filters.q,
        ...emptyCursorPaginatedResult({ limit, cursor })
      }
    }
  }

  const nextCursor = result.hasNext
    ? buildNext(result.rows[result.rows.length - 1])
    : null

  return {
    message: 'تم جلب نتائج بحث الهيكل بنجاح',
    data: {
      scope: filters.scope,
      q: filters.q,
      items: result.rows.map(mapper),
      pagination: buildCursorPaginationMeta({
        limit,
        cursor,
        nextCursor,
        hasNext: result.hasNext
      })
    }
  }
}

module.exports = {
  searchStructure
}
