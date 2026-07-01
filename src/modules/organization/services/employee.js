'use strict'

const bcrypt = require('bcryptjs')

const employeeRepository = require('../repositories/employeeRepository')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')

const userRoleAssignmentRepository =
  require('../../auth/repositories/userRoleAssignmentRepository')
const userKeyRepository = require('../../auth/repositories/userKeyRepository')

const {
  hashPin,
  computeKeyFingerprint,
  validatePublicKeyPem,
  validatePrivateKeyPem,
  assertPrivatePublicKeyPair
} = require('../../auth/services/cryptoAuthService')

const {
  encryptPrivateKeyPem,
  decryptPrivateKeyPem
} = require('../../../core/crypto/employeeKeyCrypto')

const {
  validateUpdateEmployee,
  validateListEmployeesQuery
} = require('../validations/employeeValidation')

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

// يحوّل سجل المستخدم (مع علاقاته) إلى شكل مسطّح مناسب للواجهة.
function shapeEmployee (user) {
  const plain =
    user && typeof user.get === 'function'
      ? user.get({ plain: true })
      : user

  if (!plain) return null

  const assignment = (plain.role_assignments || [])[0] || null
  const odr = assignment ? assignment.org_department_role : null

  return {
    id: plain.id,
    userName: plain.userName,
    email: plain.email,
    phone_number: plain.phone_number,
    first_name: plain.first_name,
    last_name: plain.last_name,
    father_name: plain.father_name,
    mother_name: plain.mother_name,
    national_id: plain.national_id,
    is_active: plain.is_active,
    organization: odr && odr.organization
      ? { id: odr.organization.id, name: odr.organization.name }
      : null,
    department: odr && odr.department
      ? { id: odr.department.id, name: odr.department.name }
      : null,
    role: odr && odr.role
      ? { id: odr.role.id, name: odr.role.name, code: odr.role.code }
      : null,
    organization_department_roles_id: odr ? odr.id : null,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  }
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
    items: rows.map(shapeEmployee),
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

// ================= GET BY ID =================
async function getEmployeeByIdService (id) {
  const employeeId = parseId(id)

  const employee = await employeeRepository.findEmployeeById(employeeId)

  if (!employee) {
    throw fail('الموظف غير موجود', 404)
  }

  return shapeEmployee(employee)
}

// ================= UPDATE =================
async function updateEmployeeService (data, id) {
  const employeeId = parseId(id)

  const { error, value } = validateUpdateEmployee(data)

  if (error) {
    throw fail(error.details.map(d => d.message).join(' | '), 400)
  }

  const sequelize = employeeRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const user = await employeeRepository.findRawById(employeeId, { transaction })

    if (!user) {
      throw fail('الموظف غير موجود', 404)
    }

    // ---- تحقق من تفرّد الحقول الفريدة (مع استثناء الموظف نفسه) ----
    if (value.email !== undefined) {
      const clash = await employeeRepository.findByEmailExcludingId(
        value.email, employeeId, { transaction }
      )
      if (clash) throw fail('البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر', 409)
    }

    if (value.userName !== undefined) {
      const clash = await employeeRepository.findByUserNameExcludingId(
        value.userName, employeeId, { transaction }
      )
      if (clash) throw fail('اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر', 409)
    }

    if (value.national_id !== undefined) {
      const clash = await employeeRepository.findByNationalIdExcludingId(
        value.national_id, employeeId, { transaction }
      )
      if (clash) throw fail('الرقم الوطني مسجّل مسبقاً', 409)
    }

    // ---- بناء حمولة تحديث جدول users ----
    const payload = {}
    const directFields = [
      'first_name', 'last_name', 'father_name', 'mother_name',
      'national_id', 'userName', 'email', 'phone_number', 'is_active'
    ]
    for (const field of directFields) {
      if (value[field] !== undefined) payload[field] = value[field]
    }

    if (value.password !== undefined) {
      payload.password = await bcrypt.hash(value.password, 10)
    }

    if (value.pin !== undefined) {
      payload.pin_hash = await hashPin(value.pin)
    }

    if (Object.keys(payload).length > 0) {
      await employeeRepository.updateInstance(user, payload, { transaction })
    }

    // ---- إعادة التعيين: المؤسسة/القسم/الدور ----
    if (value.organization_id !== undefined) {
      const orgDeptRole = await orgDeptRoleRepository.findByRoleOrgDept(
        value.role_id,
        value.organization_id,
        value.department_id,
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
    if (value.public_key !== undefined) {
      const publicKeyPem = validatePublicKeyPem(value.public_key)

      if (value.private_key) {
        const privateKeyPem = validatePrivateKeyPem(value.private_key)
        assertPrivatePublicKeyPair(privateKeyPem, publicKeyPem)

        const encryptedPrivateKey = encryptPrivateKeyPem(
          privateKeyPem,
          value.pin,
          computeKeyFingerprint(publicKeyPem)
        )

        const decryptedCheck = decryptPrivateKeyPem(
          {
            meta: encryptedPrivateKey.meta,
            ciphertextBase64: encryptedPrivateKey.ciphertext
          },
          value.pin
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

  // أعد قراءة الموظف بكامل علاقاته بعد التحديث
  const updated = await employeeRepository.findEmployeeById(employeeId)
  return shapeEmployee(updated)
}

module.exports = {
  getAllEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService
}
