const express = require('express')
const router = express.Router()

const {
  runStageController,
  createProcessInstance,
  getProcessInstance
} = require('../controllers/processInstance.controller')

// إنشاء معاملة
router.post('/', createProcessInstance)

// تشغيل المرحلة الحالية
router.post('/:id/run', runStageController)

// جلب حالة المعاملة
router.get('/:id', getProcessInstance)

module.exports = router