const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const { rethrowAxiosAsWorkflowError } = require('../../../utils/errorMessageHelper')

const BASE_URL =
  process.env.TRANSACTION_SERVICE_URL ||
  `http://localhost:${process.env.PORT || 4000}`

async function callTransactionApi (action, fn) {
  try {
    return await fn()
  } catch (err) {
    rethrowAxiosAsWorkflowError(err, action)
  }
}

class TransactionClient {

  async getTransactionById (id) {
    return retryWithBackoff(
      () =>
        callTransactionApi('جلب المعاملة', async () => {
          const res = await axios.get(
            `${BASE_URL}/internal/transactions/${id}`
          )

          return res.data.data
        }),
      { label: 'transactionClient.getTransactionById' }
    )
  }

  async updateStatus (id, status) {
    return retryWithBackoff(
      () =>
        callTransactionApi('تحديث حالة المعاملة', async () => {
          const res = await axios.patch(
            `${BASE_URL}/internal/transactions/${id}/status`,
            { status }
          )

          return res.data
        }),
      { label: 'transactionClient.updateStatus' }
    )
  }

  async updateData (id, data, expectedVersion = null) {
    return retryWithBackoff(
      () =>
        callTransactionApi('حفظ بيانات المعاملة', async () => {
          const body = expectedVersion != null
            ? { data, expected_version: expectedVersion }
            : data

          const res = await axios.patch(
            `${BASE_URL}/internal/transactions/${id}/data`,
            body
          )

          return res.data.data
        }),
      { label: 'transactionClient.updateData' }
    )
  }
}

module.exports = new TransactionClient()
