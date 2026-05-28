const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')

const taskDetailsRepository = require('../repositories/taskDetailsRepository')

const transactionClient = require('../../../../core/shared/clients/transaction/transactionClient')

const { enrichStagesData } = require('../../../../core/utils/filePath')

const { acquireTaskLock } = require('./taskLockService')



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



  const currentStageConfig =

    processInstance.current_stage?.stage_config?.config_json || {}



  return {

    message: 'Task details fetched successfully',

    data: {

      task: {

        id: task.id,

        name: task.name,

        taskDefinitionKey: task.taskDefinitionKey,

        created: task.created

      },

      process: {

        id: processInstance.id,

        processDefinitionId: processInstance.process_definition_id

      },

      transaction: {

        id: transaction?.id,

        code: transaction?.code,

        status: transaction?.status,

        version: transaction?.version

      },

      taskLock,

      previousStagesData,

      currentStage: {

        id: processInstance.current_stage?.id,

        name: processInstance.current_stage?.name,

        code: processInstance.current_stage?.code,

        config: currentStageConfig

      }

    }

  }

}



module.exports = {

  getTaskDetails

}

