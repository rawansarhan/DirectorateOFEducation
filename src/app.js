const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const cors = require('cors')
const errorHandler = require('./core/middleware/errorMiddleware')
const { setupSwagger } = require('./swagger')
const { getUploadsRoot } = require('./core/utils/filePath')

dotenv.config()

const app = express()

app.set('trust proxy', 1)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(getUploadsRoot()))
app.use('/public', express.static(path.join(__dirname, '../public')))

setupSwagger(app)

// ====================== ROUTES ======================

//==========================================================================
//========================== auth services =================================

const authRoutes = require('./modules/auth/routes/auth')
const pinRoutes = require('./modules/auth/routes/pin')
app.use('/api/auth', pinRoutes)
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

const documentTemplateRoutes = require('./modules/requirements/DocTemp/routes/docTemp')
app.use('/api/document-templates', documentTemplateRoutes)

const textFieldRoutes = require('./modules/requirements/text_field/routes/textField')
app.use('/api/text-fields', textFieldRoutes)

const textDropdownRoutes = require('./modules/requirements/text_dropdown/routes/textDropdown')
app.use('/api/text-dropdowns', textDropdownRoutes)

const radioGroupRoutes = require('./modules/requirements/radio_group/routes/radioGroup')
app.use('/api/radio-groups', radioGroupRoutes)

const checkListRoutes = require('./modules/requirements/check_list/routes/checkList')
app.use('/api/check-lists', checkListRoutes)

const datePickerRoutes = require('./modules/requirements/date_picker/routes/datePicker')
app.use('/api/date-pickers', datePickerRoutes)

const filePickerRoutes = require('./modules/requirements/file_picker/routes/filePicker')
app.use('/api/file-pickers', filePickerRoutes)

const typeDocRoutes = require('./modules/requirements/typeDoc/routes/typeDoc')
app.use('/api/typeDoc', typeDocRoutes)

const typeProcessRoutes = require('./modules/workflow/typeProcess/routes/typeProcess')
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

const employeeRoutes = require('./modules/organization/routes/employee')
app.use('/api/employees', employeeRoutes)

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

const workflowRoutes = require('./modules/workflow/taskCamunda/routes/workflow')
app.use('/api/workflow', workflowRoutes)

const complaintsRoutes = require('./modules/workflow/complaint/routes/complaint')
app.use('/api/complaint', complaintsRoutes)

const stageConfigRoutes = require('./modules/workflow/stageConfig/routes/stageConfig')
app.use('/api/stage_config', stageConfigRoutes)

const processDefinitionsRoutes = require('./modules/workflow/processDefinition/routes/processDefinition')
app.use('/api/process_definitions', processDefinitionsRoutes)

//process client
const internalProcessRoutes =
  require('./modules/workflow/processDefinition/routes/processInternal')
app.use(
  '/internal/process_definitions',
  internalProcessRoutes
)

//===========================================================================
//============================= transaction services ========================

const transactionRoutes = require('./modules/transaction/transaction/routes/transaction')
app.use('/api/transaction', transactionRoutes)

const documentUploadRoutes =
  require('./modules/transaction/document/routes/documentUpload')
app.use('/api/transaction/files', documentUploadRoutes)

const notificationRoutes = require('./modules/transaction/notification/routes/notification')
app.use('/api/notifications', notificationRoutes)

const verifyDocumentRoutes =
  require('./modules/transaction/integrityChain/routes/verifyDocument')
app.use('/api/verify', verifyDocumentRoutes)

const internalTransactionRoutes =
  require('./modules/transaction/transaction/routes/transactionInternal')
app.use(
  '/internal/transactions',
  internalTransactionRoutes
)



// ====================== ERROR HANDLER ======================
app.use(errorHandler)

module.exports = app