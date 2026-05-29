'use strict'

const express = require('express')
const router = express.Router()
const calculationRouter = require('./calculation')

router.use('/calculation', calculationRouter)

module.exports = router
