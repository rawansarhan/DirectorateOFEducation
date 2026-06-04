'use strict'

const express = require('express')
const router = express.Router()
const {
  processById
} = require('../../controllers/internal/processClient')

router.get(
  '/:id',
  processById
)
module.exports = router