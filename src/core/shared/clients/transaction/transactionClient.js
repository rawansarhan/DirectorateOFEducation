const axios = require('axios')
const { TRANSACTION_SERVICE_URL } = require('../../../config/env')
const { throwIfAxiosError } = require('../../../utils/httpClientError')

const BASE_URL = TRANSACTION_SERVICE_URL

class TransactionClient {

  async getTransactionById (id) {
    try {
      const res = await axios.get(
        `${BASE_URL}/internal/transactions/${id}`
      )

      return res.data.data
    } catch (err) {
      throwIfAxiosError(err, 'Failed to fetch transaction')
    }
  }

  async updateStatus (id, status) {
    try {
      const res = await axios.patch(
        `${BASE_URL}/internal/transactions/${id}/status`,
        { status }
      )

      return res.data
    } catch (err) {
      throwIfAxiosError(err, 'Failed to update transaction status')
    }
  }

  async updateData (id, data, expectedVersion = null) {
    try {
      const body = expectedVersion != null
        ? { data, expected_version: expectedVersion }
        : data

      const res = await axios.patch(
        `${BASE_URL}/internal/transactions/${id}/data`,
        body
      )

      return res.data.data
    } catch (err) {
      throwIfAxiosError(err, 'Failed to update transaction data')
    }
  }
}

module.exports = new TransactionClient()
