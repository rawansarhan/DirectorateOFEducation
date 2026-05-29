const express = require('express')

const router = express.Router()

const {
  getTransactionByIdController,
  updateTransactionStatusController,
  updateTransactionDataController
} = require('../controllers/transactionClientController')

// INTERNAL SERVICE ROUTES

router.get(
  '/:id',
  getTransactionByIdController
)

router.patch(
  '/:id/status',
  updateTransactionStatusController
)

router.patch(
  '/:id/data',
  updateTransactionDataController
)

module.exports = router 