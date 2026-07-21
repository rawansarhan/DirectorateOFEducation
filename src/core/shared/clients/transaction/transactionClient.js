'use strict'

/**
 * Transaction HTTP client — remote split only.
 * Same process: use modules/transaction/public (this client delegates automatically
 * when TRANSACTION_SERVICE_URL is unset).
 */

const axios = require('axios')
const { retryWithBackoff } = require('../../../utils/retryWithBackoff')
const { rethrowAxiosAsWorkflowError } = require('../../../utils/errorMessageHelper')
const {
  resolveRemoteBaseUrl,
  shouldUseRemoteHttp
} = require('../resolveServiceMode')

const ENV_KEY = 'TRANSACTION_SERVICE_URL'

async function callTransactionApi (action, fn) {
  try {
    return await fn()
  } catch (err) {
    rethrowAxiosAsWorkflowError(err, action)
  }
}

function inProcess () {
  return require('../../../../modules/transaction/public')
}

class TransactionClient {
  async getTransactionById (id) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().getTransactionById(id)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(
      () =>
        callTransactionApi('جلب المعاملة', async () => {
          const res = await axios.get(`${baseUrl}/internal/transactions/${id}`)
          return res.data.data
        }),
      { label: 'transactionClient.getTransactionById' }
    )
  }

  async updateStatus (id, status) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().updateTransactionStatus(id, status)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(
      () =>
        callTransactionApi('تحديث حالة المعاملة', async () => {
          const res = await axios.patch(
            `${baseUrl}/internal/transactions/${id}/status`,
            { status }
          )
          return res.data
        }),
      { label: 'transactionClient.updateStatus' }
    )
  }

  async updateData (id, data, expectedVersion = null) {
    if (!shouldUseRemoteHttp(ENV_KEY)) {
      return inProcess().updateTransactionData(id, data, expectedVersion)
    }

    const baseUrl = resolveRemoteBaseUrl(ENV_KEY)

    return retryWithBackoff(
      () =>
        callTransactionApi('حفظ بيانات المعاملة', async () => {
          const body = expectedVersion != null
            ? { data, expected_version: expectedVersion }
            : data

          const res = await axios.patch(
            `${baseUrl}/internal/transactions/${id}/data`,
            body
          )
          return res.data.data
        }),
      { label: 'transactionClient.updateData' }
    )
  }
}

module.exports = new TransactionClient()
