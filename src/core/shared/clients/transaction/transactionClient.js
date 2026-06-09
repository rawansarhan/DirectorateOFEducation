const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')

const BASE_URL =
  process.env.TRANSACTION_SERVICE_URL ||
  `http://localhost:${process.env.PORT || 4000}`

class TransactionClient {

  async getTransactionById (id) {
    return retryWithBackoff(async () => {
      const res = await axios.get(
        `${BASE_URL}/internal/transactions/${id}`
      )

      return res.data.data
    }, { label: 'transactionClient.getTransactionById' })
  }

  async updateStatus (id, status) {
    return retryWithBackoff(async () => {
      const res = await axios.patch(
        `${BASE_URL}/internal/transactions/${id}/status`,
        { status }
      )

      return res.data
    }, { label: 'transactionClient.updateStatus' })
  }

  async updateData (id, data, expectedVersion = null) {
    return retryWithBackoff(async () => {
      const body = expectedVersion != null
        ? { data, expected_version: expectedVersion }
        : data

      const res = await axios.patch(
        `${BASE_URL}/internal/transactions/${id}/data`,
        body
      )

      return res.data.data
    }, { label: 'transactionClient.updateData' })
  }
}

module.exports = new TransactionClient()
