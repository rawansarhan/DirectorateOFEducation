const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const xml2js = require('xml2js')
const { CAMUNDA_URL } = require('../../../config/camunda')

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
        throw new Error('No process found in BPMN')
      }

      const def = Object.values(definitions)[0]

      return {
        deploymentId: res.data.id,
        processKey: def.key,
        definitionId: def.id
      }
    } catch (err) {
      console.error('CAMUNDA ERROR:', err.response?.data || err.message)
      throw err
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
    const res = await axios.get(`${CAMUNDA_URL}/task/${taskId}`)
    return res.data
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

    return axios.post(`${CAMUNDA_URL}/task/${taskId}/complete`, {
      variables: camundaVariables
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
