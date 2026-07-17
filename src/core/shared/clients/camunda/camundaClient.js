const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const xml2js = require('xml2js')
const { CAMUNDA_URL } = require('../../../config/camunda')
const { formatCamundaError, rethrowAxiosAsWorkflowError } = require('../../../utils/errorMessageHelper')
const { createHttpError, HTTP_STATUS } = require('../../../middleware/httpStatusCodes')

const CAMUNDA_TIMEOUT_MS = Number(process.env.CAMUNDA_TIMEOUT_MS || 30000)

const camundaHttp = axios.create({
  timeout: CAMUNDA_TIMEOUT_MS
})

async function callCamunda (action, fn) {
  try {
    return await fn()
  } catch (err) {
    rethrowAxiosAsWorkflowError(err, action)
  }
}

/**
 * يجمع USER_TASK و SERVICE_TASK بترتيب سير العمل في BPMN
 * (مشي على sequenceFlow من startEvent)، وليس تجميع كل userTask ثم serviceTask.
 */
function collectTasksInBpmnFlowOrder (bpmnProcess = {}) {
  const TASK_TAGS = {
    'bpmn:userTask': 'USER_TASK',
    'bpmn:serviceTask': 'SERVICE_TASK'
  }

  const tasksById = new Map()

  for (const [tag, type] of Object.entries(TASK_TAGS)) {
    for (const element of bpmnProcess[tag] || []) {
      const id = element.$?.id

      if (!id) {
        continue
      }

      tasksById.set(id, {
        taskDefinitionKey: id,
        name: element.$?.name || '',
        type
      })
    }
  }

  const outgoing = new Map()

  for (const flow of bpmnProcess['bpmn:sequenceFlow'] || []) {
    const sourceRef = flow.$?.sourceRef
    const targetRef = flow.$?.targetRef

    if (!sourceRef || !targetRef) {
      continue
    }

    if (!outgoing.has(sourceRef)) {
      outgoing.set(sourceRef, [])
    }

    outgoing.get(sourceRef).push(targetRef)
  }

  const startIds = (bpmnProcess['bpmn:startEvent'] || [])
    .map(element => element.$?.id)
    .filter(Boolean)

  const ordered = []
  const visited = new Set()
  const added = new Set()

  function walk (nodeId) {
    if (!nodeId || visited.has(nodeId)) {
      return
    }

    visited.add(nodeId)

    const task = tasksById.get(nodeId)

    if (task && !added.has(nodeId)) {
      ordered.push(task)
      added.add(nodeId)
    }

    for (const nextId of outgoing.get(nodeId) || []) {
      walk(nextId)
    }
  }

  if (startIds.length) {
    for (const startId of startIds) {
      walk(startId)
    }
  }

  for (const [id, task] of tasksById) {
    if (!added.has(id)) {
      ordered.push(task)
      added.add(id)
    }
  }

  return ordered
}

class CamundaClient {
  async deployProcess (filePath) {
    const form = new FormData()

    form.append('deployment-name', 'process_deployment')
    form.append('process.bpmn', fs.createReadStream(filePath))
    form.append('enable-duplicate-filtering', 'true')
    form.append('deploy-changed-only', 'true')

    try {
      const res = await camundaHttp.post(
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
    const res = await camundaHttp.get(
      `${CAMUNDA_URL}/process-definition/key/${processKey}/xml`
    )

    const parsed = await xml2js.parseStringPromise(res.data.bpmn20Xml)
    const bpmnProcess = parsed['bpmn:definitions']['bpmn:process'][0]

    return collectTasksInBpmnFlowOrder(bpmnProcess)
  }

  async startProcess (processKey, transactionId) {
    const res = await camundaHttp.post(
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
    const res = await camundaHttp.get(`${CAMUNDA_URL}/task`, {
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

      const res = await camundaHttp.get(`${CAMUNDA_URL}/task`, {
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
    const res = await camundaHttp.get(`${CAMUNDA_URL}/history/activity-instance`, {
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
      camundaHttp.get(`${CAMUNDA_URL}/task/${taskId}`)
    )
    return res.data
  }

  async getTaskNotFoundDiagnostics (taskId) {
    try {
      const historyRes = await camundaHttp.get(`${CAMUNDA_URL}/history/task`, {
        params: { taskId }
      })
      const historyTask = historyRes.data?.[0]

      if (!historyTask) {
        return null
      }

      let activeTasks = []

      if (historyTask.processInstanceId) {
        const activeRes = await camundaHttp.get(`${CAMUNDA_URL}/task`, {
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
    return camundaHttp.post(`${CAMUNDA_URL}/task/${taskId}/claim`, {
      userId: String(userId)
    })
  }

  async unclaimTask (taskId) {
    return camundaHttp.post(`${CAMUNDA_URL}/task/${taskId}/unclaim`)
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
      camundaHttp.post(`${CAMUNDA_URL}/task/${taskId}/complete`, {
        variables: camundaVariables
      })
    )
  }

  async deleteProcessInstance (processInstanceId) {
    return camundaHttp.delete(`${CAMUNDA_URL}/process-instance/${processInstanceId}`, {
      params: {
        skipCustomListeners: true,
        skipIoMappings: true
      }
    })
  }

  async deleteDeployment (deploymentId, { cascade = true } = {}) {
    if (!deploymentId) {
      return null
    }

    return callCamunda('حذف نشر العملية', () =>
      camundaHttp.delete(`${CAMUNDA_URL}/deployment/${deploymentId}`, {
        params: {
          cascade: Boolean(cascade)
        }
      })
    )
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
