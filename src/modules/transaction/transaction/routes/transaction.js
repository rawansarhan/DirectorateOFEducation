'use strict'

/**
 * Transaction routes composer.
 * Mount order matters: specific paths before `/:transactionId`.
 */
const express = require('express')
const router = express.Router()

router.use(require('./draft'))
router.use(require('./submit'))
router.use(require('./myTransactions'))
router.use(require('./searchTransactions'))
router.use(require('./read'))

module.exports = router
