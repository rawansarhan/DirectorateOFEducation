const axios = require('axios')

// ======================================================
// BASE URL
// ======================================================

const WORKFLOW_URL =
  process.env.WORKFLOW_SERVICE_URL ||
  'http://localhost:4000/api/workflow'

// ======================================================
// GET PROCESS BY ID
// ======================================================

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