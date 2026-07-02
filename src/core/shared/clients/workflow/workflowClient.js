const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')

const WORKFLOW_URL =
  process.env.WORKFLOW_SERVICE_URL ||
  'http://localhost:4000/api/workflow'

async function getProcessById (processId) {
  return retryWithBackoff(async () => {
    try {
      const response = await axios.get(
        `${WORKFLOW_URL}/internal/process_definitions/${processId}`
      )

      return response.data.data
    } catch (err) {
      if (err.response?.status === 404) {
        return null
      }

      console.error('Workflow Client Error:', err.message)
      throw err
    }
  }, { label: 'workflowClient.getProcessById' })
}

module.exports = {
  getProcessById
}
