const {
  toAuthProcessResponse
} = require('../mappers/processMapper')

const processRepository =
  require('../repositories/processRepository')

const typeTransRepository =
  require('../repositories/typeTransRepository')

const authClient =
  require('../../../core/shared/clients/auth/authClient')
  
async function getAuthProcessesCompaint(userId) {

  // =========================================
  // FIXED TYPE = شكوى
  // =========================================
  
  
  // validate type transaction

  const typeTrans =
    await typeTransRepository.findOneWhereComplaint()

  if (!typeTrans) {
    throw new Error('لا يوجد هذا النوع')
  }

  // get user role ids from auth-service

  const roleIds =
 await authClient.getUserRoles(
      userId
    )

  // no permissions

  if (!roleIds || roleIds.length === 0) {

    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: []
    }
  }

  // optimized repository query

  const processes =
    await processRepository.findAuthProcesses(
      typeTrans.id,
      roleIds
    )

  // mapping response



const result = processes.map(
  toAuthProcessResponse
)

  // response

  return {

    message: 'تم جلب عمليات AUTH بنجاح',

    data: result
  }
}

module.exports = {
  getAuthProcessesCompaint
}