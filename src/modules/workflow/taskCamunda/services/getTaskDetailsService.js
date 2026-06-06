const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')

const taskDetailsRepository = require('../repositories/taskDetailsRepository')

const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')

const { enrichStagesData } = require('../../../../core/utils/filePath')

const { acquireTaskLock } = require('./taskLockService')
const { toTaskDetails } = require('../mappers/taskCamundaMapper')



async function getTaskDetails ({ taskId, userId }) {

  const task = await camundaClient.getTaskById(taskId)



  if (!task) {

    throw new Error('Task not found')

  }



  const processInstance =

    await taskDetailsRepository.findProcessInstanceByCamundaId(

      task.processInstanceId

    )



  if (!processInstance) {

    throw new Error('Process instance not found')

  }



  const transaction = await transactionClient.getTransactionById(

    processInstance.transaction_id

  )



  const taskLock = await acquireTaskLock({

    processInstanceId: processInstance.id,

    taskId: task.id,

    userId

  })



  const previousStagesData = enrichStagesData(transaction?.data || {})



  return {
    message: 'Task details fetched successfully',
    data: toTaskDetails({
      task,
      processInstance,
      transaction,
      taskLock,
      previousStagesData
    })
  }

}



module.exports = {

  getTaskDetails

}

