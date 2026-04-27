const {
  ValidateCreateTypeProcess,
  ValidateUpdateTypeProcess
} = require('../validations/typeProcessValidation')

const { TypeTrans } = require('../entities')
const { TypeProcessInputDTO } = require('../dto/TypeProcessInputDTO')
const { TypeProcessOutputDTO } = require('../dto/TypeProcessOutputDTO')

// ================= CREATE =================
async function createTypeProcessService(data) {
  const { error } = ValidateCreateTypeProcess(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const dto = new TypeProcessInputDTO(data)

  const typeProcess = await TypeTrans.create({
    name: dto.name
  })

  return new TypeProcessOutputDTO(typeProcess)
}

// ================= UPDATE =================
async function updateTypeProcessService(data, id) {
  const typeProcessId = parseInt(id, 10)

  if (!Number.isInteger(typeProcessId)) {
    const err = new Error('Invalid ID')
    err.statusCode = 400
    throw err
  }

  const { error } = ValidateUpdateTypeProcess(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const typeProcess = await TypeTrans.findByPk(typeProcessId)

  if (!typeProcess) {
    const err = new Error('Type process not found')
    err.statusCode = 404
    throw err
  }

  const payload = {}
  if (data.name !== undefined) payload.name = data.name
  if(data.is_active !== undefined) payload.is_active= data.is_active

  await typeProcess.update(payload)
  await typeProcess.reload()

  return new TypeProcessOutputDTO(typeProcess)
}

// ================= GET ALL =================
async function getAllTypeProcessesService() {
  const rows = await TypeTrans.findAll({
    order: [['id', 'ASC']]
  })

  return rows.map(r => new TypeProcessOutputDTO(r))
}

module.exports = {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService
}