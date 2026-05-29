const express = require('express')
const router = express.Router()

const {
  createStageTransitionController
} = require('../controllers/stageTransitionController')

router.post('/stage-transitions', createStageTransitionController)

module.exports = router