const axios = require('axios')
const { WORKFLOW_SERVICE_URL } = require('../../../config/env')

const WORKFLOW_URL = WORKFLOW_SERVICE_URL

async function getProcessById(
  processId
) {
console.log('getProcessById')
  try {

    const response = await axios.get(

      `${WORKFLOW_URL}/internal/process_definitions/${processId}`

    )
console.log(WORKFLOW_URL)
    return response.data.data

  } catch (err) {

    console.error(
      'Workflow Client Error:',
      err.message
    )

    throw new Error(
      'Failed to fetch process'
    )
  }
}

module.exports = {

  getProcessById
}
