'use strict'

const {
  ValidateCreateTypeProcess,
  ValidateUpdateTypeProcess
} = require('../validations/typeProcessValidation')

const typeTransRepository =
  require('../repositories/typeTransRepository')

const typeProcessMapper =
  require('../mappers/typeProcessMapper')

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

    err.statusCode = 400

    throw err
  }

  // ================= CREATE =================

  const typeProcess =
    await typeTransRepository.create({

      name: data.name
    })

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

    err.statusCode = 400

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

    err.statusCode = 400

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

    err.statusCode = 404

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

  // ================= RESPONSE =================

  return typeProcessMapper.toDTO(
    updated
  )
}

// ======================================================
// GET ALL
// ======================================================

async function getAllTypeProcessesService () {
  console.log('[TypeProcess] getAllTypeProcesses — all types (including complaint type in catalog)')

  const rows = await typeTransRepository.findAll()

  console.log(`[TypeProcess] returned ${rows.length} type(s)`)

  return rows.map(typeProcessMapper.toDTO)
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