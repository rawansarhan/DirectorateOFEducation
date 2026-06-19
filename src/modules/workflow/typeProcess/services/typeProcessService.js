'use strict'

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
} = require('../../../../core/cache/apiCacheService')

const LOG_PREFIX = '[TypeProcess]'

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

  const normalizedCode = String(data.code).trim().toUpperCase()

  const existingCode =
    await typeTransRepository.findByCode(normalizedCode)

  if (existingCode) {
    const err = new Error(`code "${normalizedCode}" مستخدم مسبقاً`)
    err.statusCode = 409
    err.code = 'DUPLICATE_CODE'
    throw err
  }

  const typeProcess =
    await typeTransRepository.create({
      name: String(data.name).trim(),
      code: normalizedCode
    })

  console.log(
    `${LOG_PREFIX} POST /api/typeProcess — created id=${typeProcess.id} name="${typeProcess.name}" code="${typeProcess.code}" — clearing list cache...`
  )
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

async function loadAllTypeProcesses () {
  const rows =
    await typeTransRepository.findAllWithoutComplaint()

  return rows.map(typeProcessMapper.toDTO)
}

async function getAllTypeProcessesService () {
  console.log(
    `${LOG_PREFIX} GET /api/typeProcess — loading list (cache key: api:${KEYS.typeProcesses()})`
  )

  return getOrLoad(
    KEYS.typeProcesses(),
    loadAllTypeProcesses,
    { label: 'TypeProcess GET /api/typeProcess' }
  )
}

// ======================================================
// GET ALL (active AND inactive)
// ======================================================

async function loadEveryTypeProcess () {
  const rows =
    await typeTransRepository.findAll()

  return rows.map(typeProcessMapper.toDTO)
}

async function getEveryTypeProcessService () {
  console.log(
    `${LOG_PREFIX} GET /api/typeProcess/all — loading list active+inactive (cache key: api:${KEYS.typeProcessesAll()})`
  )

  return getOrLoad(
    KEYS.typeProcessesAll(),
    loadEveryTypeProcess,
    { label: 'TypeProcess GET /api/typeProcess/all' }
  )
}

// ======================================================
// GET ALL EXCEPT COMPLAINT
// ======================================================

async function getAllTypeProcessesWithoutComplaintService () {
  return getAllTypeProcessesService()
}

module.exports = {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService,
  getEveryTypeProcessService,
  getAllTypeProcessesWithoutComplaintService
}