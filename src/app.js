const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const errorHandler = require('./core/middleware/errorMiddleware')
const { setupSwagger } = require('./swagger')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

setupSwagger(app)

// ====================== ROUTES ======================

//==========================================================================
//========================== auth services =================================

const authRoutes = require('./modules/auth/routes/auth')
app.use('/api/auth', authRoutes)


//auth client:
const authClientRoutes =
  require('./modules/auth/routes/internal/authClient')

app.use(
  '/internal/users',
  authClientRoutes
)

//==========================================================================
//=========================== repositories services ========================

const documentTemplateRoutes = require('./modules/requirements/routes/DocTem')
app.use('/api/document-templates', documentTemplateRoutes)

const fieldRoutes = require('./modules/requirements/routes/field')
app.use('/api/fields', fieldRoutes)

const fileRoutes = require('./modules/requirements/routes/file')
app.use('/api/files', fileRoutes)

const typeProcessRoutes = require('./modules/workflow/routes/typeProcess')
app.use('/api/typeProcess', typeProcessRoutes)

//==========================================================================
//====================  organization services ==============================

const organizationRoutes = require('./modules/organization/routes/organization')
app.use('/api/organization', organizationRoutes)

const departmentRoutes = require('./modules/organization/routes/department')
app.use('/api/department', departmentRoutes)

const roleRoutes = require('./modules/organization/routes/role')
app.use('/api/role', roleRoutes)

const locationRoutes = require('./modules/organization/routes/location')
app.use('/api/location', locationRoutes)

// organization client 

const organizationClientRoutes =
  require('./modules/organization/routes/internal/Organization')
app.use(
  '/organizations',
  organizationClientRoutes
)

//  OrgDeptRole

const OrgDeptRoleClientRoutes =
  require('./modules/organization/routes/internal/OrgDeptRoles')
app.use(
  '/internal/org-dept-roles',
  OrgDeptRoleClientRoutes
)

//==========================================================================
//======================= workflow services ================================

const processInstancesRoutes = require('./modules/workflow/routes/processInstance')
app.use('/process-instances', processInstancesRoutes)

const complaintsRoutes = require('./modules/workflow/routes/complaint')
app.use('/api/complaint', complaintsRoutes)

const stageConfigRoutes = require('./modules/workflow/routes/stageConfig')
app.use('/api/stage_config', stageConfigRoutes)

const processDefinitionsRoutes = require('./modules/workflow/routes/processDefinition')
app.use('/api/process_definitions', processDefinitionsRoutes)

//process client
const internalProcessRoutes =
  require('./modules/workflow/routes/internal/processClient')
app.use(
  '/internal/process_definitions',
  internalProcessRoutes
)

//===========================================================================
//============================= transaction services ========================

const transactionRoutes = require('./modules/transaction/routes/Transaction')
app.use('/api/transaction', transactionRoutes)


//TransactionClient
const internalTransactionRoutes =
  require('./modules/transaction/routes/TransactionClient')
app.use(
  '/internal/transactions',
  internalTransactionRoutes
)



// ====================== ERROR HANDLER ======================
app.use(errorHandler)

// 👇 هنا مهم جداً
const { startOutboxWorker } =
  require('./core/shared/outbox/workers/outboxWorker')

startOutboxWorker()


module.exports = app