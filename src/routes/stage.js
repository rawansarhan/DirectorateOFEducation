const express = require('express')
const router = express.Router()

const { createStage } = require('../controllers/Stage')

router.post('/stages', createStage)

module.exports = router