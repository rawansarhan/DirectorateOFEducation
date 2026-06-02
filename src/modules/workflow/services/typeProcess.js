'use strict'

const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

const {
  ValidateCreateTypeProcess,
  ValidateUpdateTypeProcess
} = require('../validations/typeProcessValidation')

const typeTransRepository =
  require('../repositories/typeTransRepository')

const typeProcessMapper =
  require('../mappers/typeProcessMapper')

const {
  getOrLoad,
  KEYS,
  invalidateTypeProcesses
} = require('../../../core/cache/apiCacheService')

// ======================================================
// CREATE
// ======================================================

async function createTypeProcessService(data) {

  // ================= VALIDATION =================

  const { error } =
    ValidateCreateTypeProcess(data)

  if (error) {

    const msg =
      error.details
        .map(d => d.message)
        .join(' | ')

    const err = new Error(msg)

    err.statusCode = HTTP_STATUS.BAD_REQUEST

    throw err
  }

  // ================= CREATE =================

  const typeProcess =
    await typeTransRepository.create({

      name: data.name
    })

  await invalidateTypeProcesses()

  // ================= RESPONSE =================

  return typeProcessMapper.toDTO(
    typeProcess
  )
}

// ======================================================
// UPDATE
// ======================================================

async function updateTypeProcessService(
  data,
  id
) {

  const typeProcessId =
    parseInt(id, 10)

  if (!Number.isInteger(typeProcessId)) {

    const err =
      new Error('Invalid ID')

    err.statusCode = HTTP_STATUS.BAD_REQUEST

    throw err
  }

  // ================= VALIDATION =================

  const { error } =
    ValidateUpdateTypeProcess(data)

  if (error) {

    const msg =
      error.details
        .map(d => d.message)
        .join(' | ')

    const err = new Error(msg)

    err.statusCode = HTTP_STATUS.BAD_REQUEST

    throw err
  }

  // ================= FIND =================

  const typeProcess =
    await typeTransRepository.findById(
      typeProcessId
    )

  if (!typeProcess) {

    const err =
      new Error(
        'Type process not found'
      )

    err.statusCode = HTTP_STATUS.NOT_FOUND

    throw err
  }

  // ================= UPDATE =================

  const payload = {}

  if (
    data.is_active !== undefined
  ) {

    payload.is_active =
      data.is_active
  }

  const updated =
    await typeTransRepository.update(
      typeProcess,
      payload
    )

  await invalidateTypeProcesses()

  // ================= RESPONSE =================

  return typeProcessMapper.toDTO(
    updated
  )
}

// ======================================================
// GET ALL
// ======================================================

async function getAllTypeProcessesService () {
  return getOrLoad(
    KEYS.typeProcesses(),
    async () => {
      const rows = await typeTransRepository.findAll()
      return rows.map(typeProcessMapper.toDTO)
    },
    { label: 'GET /api/typeProcess/' }
  )
}

// ======================================================
// GET ALL EXCEPT COMPLAINT
// ======================================================

async function getAllTypeProcessesWithoutComplaintService() {

  const rows =
    await typeTransRepository
      .findAllWithoutComplaint()

  return rows.map(
    typeProcessMapper.toDTO
  )
}

module.exports = {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService,
  getAllTypeProcessesWithoutComplaintService
}