const { toDTOList } = require('../mappers/complaintMapper')
const complaintRepository = require('../repositories/complaintRepository')
const { validateComplaintUserId } = require('../validations/complaintValidations')

const typeTransRepository =
  require('../../typeProcess/repositories/typeTransRepository')

const authClient =
  require('../../../../core/shared/clients/auth/authClient')
  
async function getAuthProcessesCompaint (userId) {
  validateComplaintUserId(userId)

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
    await complaintRepository.findAuthComplaintProcesses(
      typeTrans.id,
      roleIds
    )

  const result = toDTOList(processes)

  // response

  return {

    message: 'تم جلب عمليات AUTH بنجاح',

    data: result
  }
}

module.exports = {
  getAuthProcessesCompaint
}