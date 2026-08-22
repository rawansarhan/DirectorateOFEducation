'use strict'

function createHttpError (message, statusCode = 400, code = 'VALIDATION_ERROR') {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  return err
}


function normalizeNullableId (value, fieldName) {
  if (value === 0 || value === '0' || value == null || value === '') {
    return null
  }

  const n = Number(value)

  if (!Number.isInteger(n) || n < 1) {
    throw createHttpError(
      `${fieldName} يجب أن يكون رقماً صحيحاً موجباً أو null/0/فارغ`
    )
  }

  return n
}

function parsePermissionIds (raw) {
  if (raw == null) {
    throw createHttpError('permission_id مطلوب (مصفوفة من المعرفات)')
  }

  const list = Array.isArray(raw) ? raw : [raw]
  const ids = []

  for (const item of list) {
    const id = Number(item)

    if (!Number.isInteger(id) || id < 1) {
      throw createHttpError('permission_id يجب أن يحتوي أرقاماً صحيحة موجبة فقط')
    }

    ids.push(id)
  }

  return [...new Set(ids)]
}

function resolvePermissionIdsInput (body = {}) {
  if (body.permission_id != null) {
    return body.permission_id
  }

  if (body.permission_ids != null) {
    return body.permission_ids
  }

  return null
}

function parseOrgDeptRoleBody (body = {}) {
  return {
    organizationId: normalizeNullableId(body.organization_id, 'organization_id'),
    departmentId: normalizeNullableId(body.department_id, 'department_id'),
    roleId: normalizeNullableId(body.role_id, 'role_id'),
    permissionIds: parsePermissionIds(resolvePermissionIdsInput(body))
  }
}

function parseOrgDeptRoleQuery (query = {}) {
  return {
    organizationId: normalizeNullableId(query.organization_id, 'organization_id'),
    departmentId: normalizeNullableId(query.department_id, 'department_id'),
    roleId: normalizeNullableId(query.role_id, 'role_id')
  }
}

function parseUserIdParam (raw) {
  const userId = Number(raw)

  if (!Number.isInteger(userId) || userId < 1) {
    throw createHttpError('user_id يجب أن يكون رقماً صحيحاً موجباً')
  }

  return userId
}

module.exports = {
  createHttpError,
  normalizeNullableId,
  parseOrgDeptRoleBody,
  parseOrgDeptRoleQuery,
  parsePermissionIds,
  parseUserIdParam
}
