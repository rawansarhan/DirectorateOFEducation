'use strict'

const bcrypt = require('bcryptjs')

const employeeRepository = require('../repositories/employeeRepository')
const orgDeptRoleRepository = require('../../role/repositories/orgDeptRoleRepository')

const userRoleAssignmentRepository =
  require('../../../auth/shared/repositories/userRoleAssignmentRepository')
const userKeyRepository = require('../../../auth/shared/repositories/userKeyRepository')
const {
  invalidateUserAccessibleDepartments,
  invalidateEmployeesByDepartments,
  invalidateDepartmentOverview,
  getOrLoad,
  KEYS
} = require('../../../../core/cache/apiCacheService')
const { API_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')

const {
  hashPin,
  computeKeyFingerprint,
  validatePublicKeyPem,
  validatePrivateKeyPem,
  assertPrivatePublicKeyPair
} = require('../../../auth/shared/services/cryptoAuthService')

const {
  encryptPrivateKeyPem,
  decryptPrivateKeyPem
} = require('../../../../core/crypto/employeeKeyCrypto')

const {
  validateUpdateEmployee,
  validateListEmployeesQuery,
  validateSearchEmployeesQuery,
  validateUsersByOrgRoleDeptQuery
} = require('../validations/employeeValidation')
const {
  parseCursorPaginationQuery,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult,
  encodeCursor
} = require('../../../../core/utils/pagination')
const {
  toUpdateInput,
  toUpdateUserPayload,
  toDTO,
  toDTOList,
  toAssignmentDTOList
} = require('../mappers/employeeMapper')

// أداة موحّدة لرمي خطأ مع statusCode (نفس نمط بقية الخدمات)
function fail (message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function parseId (id, label = 'معرّف الموظف') {
  const value = parseInt(id, 10)

  if (!Number.isInteger(value) || value < 1) {
    throw fail(`${label} غير صالح`, 400)
  }

  return value
}

// ================= GET ALL (paginated + search) =================
async function getAllEmployeesService (query = {}) {
  const { error, value } = validateListEmployeesQuery(query)

  if (error) {
    throw fail(error.details.map(d => d.message).join(' | '), 400)
  }

  const { page, limit, search } = value
  const offset = (page - 1) * limit

  const { rows, count } = await employeeRepository.findAllEmployees({
    limit,
    offset,
    search: search || undefined
  })

  const totalPages = Math.ceil(count / limit) || 0

  return {
    items: toDTOList(rows),
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

// ================= SEARCH (cursor) =================
async function searchEmployeesService (query = {}) {
  const { error, value } = validateSearchEmployeesQuery(query)

  if (error) {
    throw fail(error.details.map(d => d.message).join(' | '), 400)
  }

  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(query, {
    defaultLimit: 20
  })

  if (decodedCursor && decodedCursor.k !== 'emp') {
    throw fail('cursor غير صالح لهذا البحث', 400)
  }

  const { rows, hasNext } = await employeeRepository.findEmployeesWithCursor({
    limit,
    cursor: decodedCursor,
    search: value.search || undefined
  })

  if (!rows.length) {
    return emptyCursorPaginatedResult({ limit, cursor })
  }

  const last = rows[rows.length - 1]
  const nextCursor = hasNext
    ? encodeCursor({ k: 'emp', id: Number(last.id) })
    : null

  return {
    items: toDTOList(rows),
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    })
  }
}

// ================= GET BY ID =================
async function getEmployeeByIdService (id) {
  const employeeId = parseId(id)

  const employee = await employeeRepository.findEmployeeById(employeeId)

  if (!employee) {
    throw fail('الموظف غير موجود', 404)
  }

  return toDTO(employee)
}

// ================= GET USERS BY organization + role + department =================
async function loadUsersByOrgRoleDept ({
  organizationId,
  roleId,
  departmentId
}) {
  const orgDeptRole = await orgDeptRoleRepository.findByRoleOrgDept(
    roleId,
    organizationId,
    departmentId
  )

  if (!orgDeptRole) {
    throw fail('لا يوجد دور لدائرة ضمن هذه المنظمة', 404)
  }

  const assignments = await employeeRepository.findUsersByOrgDeptRoleId(
    orgDeptRole.id,
    { activeOnly: true }
  )

  return {
    organization_id: organizationId,
    role_id: roleId,
    department_id: departmentId,
    organization_department_roles_id: orgDeptRole.id,
    total: assignments.length,
    items: toAssignmentDTOList(assignments)
  }
}

async function getUsersByOrgRoleDeptService (query = {}) {
  const { error, value } = validateUsersByOrgRoleDeptQuery(query)

  if (error) {
    throw fail(error.details.map(d => d.message).join(' | '), 400)
  }

  const {
    organization_id: organizationId,
    role_id: roleId,
    department_id: departmentId
  } = value

  return getOrLoad(
    KEYS.employeesByOrgRoleDept(organizationId, roleId, departmentId),
    () =>
      retryWithBackoff(
        () =>
          loadUsersByOrgRoleDept({
            organizationId,
            roleId,
            departmentId
          }),
        {
          label: `employees:by-odr:org${organizationId}:role${roleId}:dept${departmentId}`
        }
      ),
    {
      label:
        `Employee GET /api/employees/by-org-dept-role` +
        `?organization_id=${organizationId}&role_id=${roleId}&department_id=${departmentId}`,
      ttlSeconds: API_CACHE_TTL_SECONDS
    }
  )
}

// ================= UPDATE =================
async function updateEmployeeService (data, id) {
  const employeeId = parseId(id)

  const { error, value } = validateUpdateEmployee(data)

  if (error) {
    throw fail(error.details.map(d => d.message).join(' | '), 400)
  }

  const input = toUpdateInput(value)

  const sequelize = employeeRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const user = await employeeRepository.findRawById(employeeId, { transaction })

    if (!user) {
      throw fail('الموظف غير موجود', 404)
    }

    // ---- تحقق من تفرّد الحقول الفريدة (مع استثناء الموظف نفسه) ----
    if (input.email !== undefined) {
      const clash = await employeeRepository.findByEmailExcludingId(
        input.email, employeeId, { transaction }
      )
      if (clash) throw fail('البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر', 409)
    }

    if (input.userName !== undefined) {
      const clash = await employeeRepository.findByUserNameExcludingId(
        input.userName, employeeId, { transaction }
      )
      if (clash) throw fail('اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر', 409)
    }

    if (input.national_id !== undefined) {
      const clash = await employeeRepository.findByNationalIdExcludingId(
        input.national_id, employeeId, { transaction }
      )
      if (clash) throw fail('الرقم الوطني مسجّل مسبقاً', 409)
    }

    // ---- بناء حمولة تحديث جدول users ----
    const payload = toUpdateUserPayload(input)

    if (input.password !== undefined) {
      payload.password = await bcrypt.hash(input.password, 10)
    }

    if (input.pin !== undefined) {
      payload.pin_hash = await hashPin(input.pin)
    }

    if (Object.keys(payload).length > 0) {
      await employeeRepository.updateInstance(user, payload, { transaction })
    }

    // ---- إعادة التعيين: المؤسسة/القسم/الدور ----
    if (input.organization_id !== undefined) {
      const orgDeptRole = await orgDeptRoleRepository.findByRoleOrgDept(
        input.role_id,
        input.organization_id,
        input.department_id,
        { transaction }
      )

      if (!orgDeptRole) {
        throw fail(
          'لا يوجد دور مرتبط بهذه المؤسسة والقسم. تأكد من إنشاء organization_department_role أولاً',
          404
        )
      }

      // عطّل التعيينات الحالية الفعّالة ثم أنشئ تعييناً جديداً
      await userRoleAssignmentRepository.deactivateAllByUserId(
        employeeId, { transaction }
      )

      await userRoleAssignmentRepository.create(
        {
          user_id: employeeId,
          organization_department_roles_id: orgDeptRole.id,
          is_active: true
        },
        { transaction }
      )
    }

    // ---- تحديث المفتاح العام (واختيارياً الخاص) ----
    if (input.public_key !== undefined) {
      const publicKeyPem = validatePublicKeyPem(input.public_key)

      if (input.private_key) {
        const privateKeyPem = validatePrivateKeyPem(input.private_key)
        assertPrivatePublicKeyPair(privateKeyPem, publicKeyPem)

        const encryptedPrivateKey = encryptPrivateKeyPem(
          privateKeyPem,
          input.pin,
          computeKeyFingerprint(publicKeyPem)
        )

        const decryptedCheck = decryptPrivateKeyPem(
          {
            meta: encryptedPrivateKey.meta,
            ciphertextBase64: encryptedPrivateKey.ciphertext
          },
          input.pin
        )

        if (decryptedCheck !== privateKeyPem) {
          throw fail('فشل التحقق من تشفير المفتاح الخاص', 400)
        }
      }

      const keyFingerprint = computeKeyFingerprint(publicKeyPem)

      // عطّل المفتاح الفعّال الحالي ثم أضِف مفتاحاً جديداً (تاريخ المفاتيح محفوظ)
      const currentKey = await userKeyRepository.findActiveLatestByUserId(
        employeeId, { transaction }
      )
      if (currentKey) {
        await currentKey.update({ is_active: false }, { transaction })
      }

      await userKeyRepository.create(
        {
          user_id: employeeId,
          public_key: publicKeyPem,
          key_fingerprint: keyFingerprint,
          algorithm: 'ed25519',
          is_active: true
        },
        { transaction }
      )
    }

    await transaction.commit()
  } catch (err) {
    if (!transaction.finished) {
      await transaction.rollback()
    }
    throw err
  }

  if (input.organization_id !== undefined) {
    await invalidateUserAccessibleDepartments(employeeId)
  }

  await invalidateEmployeesByDepartments()

  if (input.department_id !== undefined) {
    await invalidateDepartmentOverview(input.department_id)
  }

  // أعد قراءة الموظف بكامل علاقاته بعد التحديث
  const updated = await employeeRepository.findEmployeeById(employeeId)
  return toDTO(updated)
}

module.exports = {
  getAllEmployeesService,
  searchEmployeesService,
  getEmployeeByIdService,
  getUsersByOrgRoleDeptService,
  updateEmployeeService
}
