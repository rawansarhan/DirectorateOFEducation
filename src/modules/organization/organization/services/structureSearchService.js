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

function mapDept (row) {
  const p = row.get ? row.get({ plain: true }) : row
  return {
    kind: 'department',
    id: p.id,
    name: p.name,
    organization_id: p.organization_id,
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
    department_id: p.department_id,
    department_name: p.department?.name ?? null,
    camunda_group_key: p.camunda_group_key ?? null,
    is_active: Boolean(p.is_active)
  }
}

function mapEmployee (row) {
  const p = row.get ? row.get({ plain: true }) : row
  const assignments = (p.role_assignments || []).map(a => {
    const odr = a.org_department_role || {}
    return {
      assignment_id: a.id,
      odr_id: odr.id ?? a.organization_department_roles_id,
      role: odr.role
        ? { id: odr.role.id, name: odr.role.name, code: odr.role.code }
        : null,
      department: odr.department
        ? { id: odr.department.id, name: odr.department.name }
        : null
    }
  })

  return {
    kind: 'employee',
    id: p.id,
    userName: p.userName ?? null,
    email: p.email ?? null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    father_name: p.father_name ?? null,
    mother_name: p.mother_name ?? null,
    national_id: p.national_id ?? null,
    is_active: Boolean(p.is_active),
    assignments
  }
}

function buildNameCursor (kind, row) {
  const p = row.get ? row.get({ plain: true }) : row
  if (typeof p.name !== 'string' || !Number.isFinite(Number(p.id))) return null
  return encodeCursor({ k: kind, n: p.name, id: Number(p.id) })
}

function buildIdCursor (kind, row) {
  const p = row.get ? row.get({ plain: true }) : row
  if (!Number.isFinite(Number(p.id))) return null
  return encodeCursor({ k: kind, id: Number(p.id) })
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
    organizationId: filters.organization_id,
    isActive: filters.is_active
  }

  // typeahead: ثلاث قوائم قصيرة ضمن نفس المؤسسة
  if (filters.scope === 'all') {
    if (cursor) {
      throw createHttpError(
        'cursor غير مدعوم مع scope=all — استخدم scope=department|role|employee',
        HTTP_STATUS.BAD_REQUEST,
        'VALIDATION_ERROR'
      )
    }

    const capped = Math.min(limit, 20)
    const opts = { ...common, limit: capped }

    const [depts, roles, employees] = await Promise.all([
      structureSearchRepository.searchDepartments(filters.q, opts),
      structureSearchRepository.searchRoles(filters.q, opts),
      structureSearchRepository.searchEmployees(filters.q, opts)
    ])

    return {
      message: 'تم جلب نتائج بحث الهيكل بنجاح',
      data: {
        organization_id: filters.organization_id,
        scope: 'all',
        q: filters.q,
        departments: depts.rows.map(mapDept),
        roles: roles.rows.map(mapRole),
        employees: employees.rows.map(mapEmployee),
        pagination: {
          limit: capped,
          departments_has_next: depts.hasNext,
          roles_has_next: roles.hasNext,
          employees_has_next: employees.hasNext
        }
      }
    }
  }

  const expectedKind =
    filters.scope === 'department'
      ? 'dept'
      : filters.scope === 'role'
        ? 'odr'
        : 'emp'

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

  if (filters.scope === 'department') {
    result = await structureSearchRepository.searchDepartments(filters.q, {
      ...common,
      cursor: decodedCursor
    })
    mapper = mapDept
    buildNext = row => buildNameCursor('dept', row)
  } else if (filters.scope === 'role') {
    result = await structureSearchRepository.searchRoles(filters.q, {
      ...common,
      cursor: decodedCursor
    })
    mapper = mapRole
    buildNext = row => buildIdCursor('odr', row)
  } else {
    result = await structureSearchRepository.searchEmployees(filters.q, {
      ...common,
      cursor: decodedCursor
    })
    mapper = mapEmployee
    buildNext = row => buildIdCursor('emp', row)
  }

  if (!result.rows.length) {
    return {
      message: 'تم جلب نتائج بحث الهيكل بنجاح',
      data: {
        organization_id: filters.organization_id,
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
      organization_id: filters.organization_id,
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
