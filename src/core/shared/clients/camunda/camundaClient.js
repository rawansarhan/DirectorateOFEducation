const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const xml2js = require('xml2js')
const { CAMUNDA_URL } = require('../../../config/camunda')
const { formatCamundaError, rethrowAxiosAsWorkflowError } = require('../../../utils/errorMessageHelper')
const { createHttpError, HTTP_STATUS } = require('../../../middleware/httpStatusCodes')

async function callCamunda (action, fn) {
  try {
    return await fn()
  } catch (err) {
    rethrowAxiosAsWorkflowError(err, action)
  }
}
class CamundaClient {
  async deployProcess (filePath) {
    const form = new FormData()

    form.append('deployment-name', 'process_deployment')
    form.append('process.bpmn', fs.createReadStream(filePath))
    form.append('enable-duplicate-filtering', 'true')
    form.append('deploy-changed-only', 'true')

    try {
      const res = await axios.post(
        `${CAMUNDA_URL}/deployment/create`,
        form,
        { headers: form.getHeaders() }
      )

      const definitions = res.data.deployedProcessDefinitions

      if (!definitions || Object.keys(definitions).length === 0) {
        throw createHttpError(
          'لم يُعثر على process داخل ملف BPMN — تأكد أن الملف يحتوي bpmn:process صالح',
          HTTP_STATUS.BAD_REQUEST,
          'VALIDATION_ERROR'
        )
      }

      const def = Object.values(definitions)[0]

      return {
        deploymentId: res.data.id,
        processKey: def.key,
        definitionId: def.id
      }
    } catch (err) {
      console.error('CAMUNDA ERROR:', err.response?.data || err.message)

      if (err.code === 'VALIDATION_ERROR' || err.statusCode) {
        throw err
      }

      const message = formatCamundaError(err, 'نشر BPMN')
      const deployError = createHttpError(message, HTTP_STATUS.BAD_REQUEST, 'CAMUNDA_ERROR')
      deployError.expose = true
      throw deployError
    }
  }

  async getProcessTasks (processKey) {
    const res = await axios.get(
      `${CAMUNDA_URL}/process-definition/key/${processKey}/xml`
    )

    const parsed = await xml2js.parseStringPromise(res.data.bpmn20Xml)
    const bpmnProcess = parsed['bpmn:definitions']['bpmn:process'][0]
    const userTasks = bpmnProcess['bpmn:userTask'] || []
    const serviceTasks = bpmnProcess['bpmn:serviceTask'] || []
    const tasks = []

    for (const t of userTasks) {
      tasks.push({
        taskDefinitionKey: t.$.id,
        name: t.$.name || '',
        type: 'USER_TASK'
      })
    }

    for (const t of serviceTasks) {
      tasks.push({
        taskDefinitionKey: t.$.id,
        name: t.$.name || '',
        type: 'SERVICE_TASK'
      })
    }

    return tasks
  }

  async startProcess (processKey, transactionId) {
    const res = await axios.post(
      `${CAMUNDA_URL}/process-definition/key/${processKey}/start`,
      {
        variables: {
          transactionId: {
            value: transactionId,
            type: 'Integer'
          }
        }
      }
    )

    return res.data
  }

  async getActiveTasks (processInstanceId) {
    const res = await axios.get(`${CAMUNDA_URL}/task`, {
      params: { processInstanceId }
    })

    return res.data
  }

  async getActiveTasksByProcessInstanceIds (processInstanceIds = []) {
    const uniqueIds = [...new Set(processInstanceIds.filter(Boolean))]

    if (!uniqueIds.length) {
      return new Map()
    }

    const CHUNK_SIZE = 50
    const taskMap = new Map()

    for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(index, index + CHUNK_SIZE)

      const res = await axios.get(`${CAMUNDA_URL}/task`, {
        params: {
          processInstanceIdIn: chunk.join(',')
        }
      })

      for (const task of res.data || []) {
        if (!task?.processInstanceId || taskMap.has(task.processInstanceId)) {
          continue
        }

        taskMap.set(task.processInstanceId, task)
      }
    }

    return taskMap
  }

  async getCompletedServiceTaskKeys (processInstanceId) {
    const res = await axios.get(`${CAMUNDA_URL}/history/activity-instance`, {
      params: {
        processInstanceId,
        activityType: 'serviceTask',
        finished: true,
        sortBy: 'endTime',
        sortOrder: 'asc'
      }
    })

    return (res.data || []).map(item => item.activityId)
  }

  async getTaskById (taskId) {
    const res = await callCamunda('جلب المهمة', () =>
      axios.get(`${CAMUNDA_URL}/task/${taskId}`)
    )
    return res.data
  }

  async getTaskNotFoundDiagnostics (taskId) {
    try {
      const historyRes = await axios.get(`${CAMUNDA_URL}/history/task`, {
        params: { taskId }
      })
      const historyTask = historyRes.data?.[0]

      if (!historyTask) {
        return null
      }

      let activeTasks = []

      if (historyTask.processInstanceId) {
        const activeRes = await axios.get(`${CAMUNDA_URL}/task`, {
          params: { processInstanceId: historyTask.processInstanceId }
        })
        activeTasks = activeRes.data || []
      }

      const activeTask = activeTasks[0] || null

      return {
        requested_task_id: taskId,
        history_task: {
          name: historyTask.name,
          task_definition_key: historyTask.taskDefinitionKey,
          state: historyTask.taskState || historyTask.deleteReason || 'unknown',
          completed_at: historyTask.endTime || null,
          assignee: historyTask.assignee || null,
          process_instance_id: historyTask.processInstanceId
        },
        current_active_task: activeTask
          ? {
              task_id: activeTask.id,
              name: activeTask.name,
              task_definition_key: activeTask.taskDefinitionKey,
              assignee: activeTask.assignee || null
            }
          : null
      }
    } catch (_) {
      return null
    }
  }

  async claimTask (taskId, userId) {
    return axios.post(`${CAMUNDA_URL}/task/${taskId}/claim`, {
      userId: String(userId)
    })
  }

  async unclaimTask (taskId) {
    return axios.post(`${CAMUNDA_URL}/task/${taskId}/unclaim`)
  }

  async completeTask (taskId, variables = {}) {
    const camundaVariables = {}

    Object.entries(variables).forEach(([key, val]) => {
      const variable = typeof val === 'object' && val !== null && 'value' in val
        ? val
        : { value: val }

      camundaVariables[key] = {
        value: variable.value,
        type: variable.type || this.inferVariableType(variable.value)
      }
    })

    return callCamunda('إكمال المهمة', () =>
      axios.post(`${CAMUNDA_URL}/task/${taskId}/complete`, {
        variables: camundaVariables
      })
    )
  }

  async deleteProcessInstance (processInstanceId) {
    return axios.delete(`${CAMUNDA_URL}/process-instance/${processInstanceId}`, {
      params: {
        skipCustomListeners: true,
        skipIoMappings: true
      }
    })
  }

  inferVariableType (value) {
    if (typeof value === 'boolean') return 'Boolean'
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'Integer' : 'Double'
    }
    return 'String'
  }
}

module.exports = new CamundaClient()
