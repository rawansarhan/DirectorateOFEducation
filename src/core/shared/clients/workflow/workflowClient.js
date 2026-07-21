'use strict'

/**
 * Workflow HTTP client — remote split only.
 * Same process: modules/workflow/public when WORKFLOW_SERVICE_URL is unset.
 */

const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
} = require('../resolveServiceMode')

const ENV_KEY = 'WORKFLOW_SERVICE_URL'

async function getProcessById (processId) {
  if (!shouldUseRemoteHttp(ENV_KEY)) {
    return require('../../../../modules/workflow/public').getProcessById(processId)
  }

  const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

  return retryWithBackoff(async () => {
    try {
      const response = await axios.get(
        `${baseUrl}/api/workflow/internal/process_definitions/${processId}`
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
