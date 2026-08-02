const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const express = require('express')
const router = express.Router()
const {
getComplaintProcesses
} = require('../controllers/complaintController')


module.exports = router