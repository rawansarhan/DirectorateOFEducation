'use strict'

const path = require('path')
const fs = require('fs')

const failures = []

const checks = [
  './src/modules/transaction/public',
  './src/modules/workflow/public',
  './src/modules/organization/public',
  './src/modules/auth/public',
  './src/swagger',
  './src/core/shared/clients/transaction/transactionClient',
  './src/core/shared/clients/workflow/workflowClient',
  './src/core/shared/clients/auth/authClient',
  './src/core/shared/clients/organization/organizationClient',
  './src/core/shared/clients/organization/orgDeptRolesClient',
  './src/core/utils/pagination',
  './src/modules/workflow/taskCamunda/services/startWorkflowService',
  './src/modules/workflow/taskCamunda/services/getTaskDetailsService',
  './src/modules/workflow/taskCamunda/services/completeTaskService',
  './src/modules/workflow/taskCamunda/services/getAllTasksService',
  './src/modules/workflow/taskCamunda/services/documentSubmitService',
  './src/modules/workflow/taskCamunda/services/transactionSigningService',
  './src/modules/workflow/taskCamunda/controllers/taskController',
  './src/modules/transaction/transaction/controllers/documentSubmitController',
  './src/modules/transaction/integrityChain/controllers/integrityChainController',
  './src/modules/transaction/integrityChain/services/documentVerifyAppService',
  './src/modules/transaction/transaction/routes/submit',
  './src/modules/workflow/stageConfig/services/stageConfigService',
  './src/modules/workflow/processDefinition/services/processDefinitionService',
  './src/modules/auth/register/services/registerAuthService',
  './src/modules/transaction/transaction/services/transactionSubmitService',
  './src/app'
]

delete process.env.TRANSACTION_SERVICE_URL
delete process.env.WORKFLOW_SERVICE_URL
delete process.env.AUTH_SERVICE_URL
delete process.env.ORGANIZATION_SERVICE_URL

for (const mod of checks) {
  try {
    require(path.resolve(mod))
    console.log('OK  ', mod)
  } catch (e) {
    failures.push({ mod, message: e.message })
    console.log('FAIL', mod, '-', e.message)
  }
}

try {
  const {
    encodeCursor,
    decodeCursor,
    parseCursorPaginationQuery
  } = require(path.resolve('./src/core/utils/pagination'))

  const encoded = encodeCursor({ k: 'all', o: 3 })
  const decoded = decodeCursor(encoded)

  if (decoded.k !== 'all' || decoded.o !== 3) {
    throw new Error('all cursor mismatch')
  }

  const parsed = parseCursorPaginationQuery({ cursor: 'string' })
  if (parsed.cursor !== null) {
    throw new Error('swagger placeholder not ignored')
  }

  console.log('OK   pagination cursor (all + swagger placeholder)')
} catch (e) {
  failures.push({ mod: 'pagination', message: e.message })
  console.log('FAIL pagination', e.message)
}

function walkJsFiles (dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkJsFiles(full, out)
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}

function findMatches (dir, regex) {
  return walkJsFiles(dir).filter((file) => regex.test(fs.readFileSync(file, 'utf8')))
}

const badTx = findMatches(
  './src/modules/workflow',
  /require\(['"].*transaction\/(transaction|document|certificate|integrityChain)/
)
const badWf = findMatches(
  './src/modules/transaction',
  /require\(['"].*workflow\/(taskCamunda|processDefinition|services\/|stageConfig)/
)
const badClients = findMatches(
  './src/modules',
  /require\(['"].*clients\/(transaction|workflow|auth|organization)/
)
const badControllerRepos = findMatches(
  './src/modules',
  /controllers\/.*require\(['"].*repositories\//
)

// controllers requiring repositories: scan controller files only
const controllerRepoLeaks = walkJsFiles('./src/modules')
  .filter((f) => f.includes(`${path.sep}controllers${path.sep}`))
  .filter((f) => /require\(['"][^'"]*repositories\//.test(fs.readFileSync(f, 'utf8')))

if (badTx.length) {
  console.log('FAIL deep workflow->transaction', badTx)
  failures.push({ mod: 'deep-tx' })
} else {
  console.log('OK   no deep workflow->transaction requires')
}

if (badWf.length) {
  console.log('FAIL deep transaction->workflow', badWf)
  failures.push({ mod: 'deep-wf' })
} else {
  console.log('OK   no deep transaction->workflow requires')
}

if (badClients.length) {
  console.log('FAIL modules still use HTTP clients', badClients)
  failures.push({ mod: 'clients' })
} else {
  console.log('OK   modules do not require HTTP clients')
}

if (controllerRepoLeaks.length) {
  console.log('FAIL controllers require repositories', controllerRepoLeaks)
  failures.push({ mod: 'controller-repos' })
} else {
  console.log('OK   no controller->repository requires')
}

try {
  const swaggerPath = path.join(__dirname, '..', 'src', 'swagger')
  const { swaggerSpec } = require(swaggerPath)
  const paths = Object.keys(swaggerSpec.paths || {}).length
  const schemas = Object.keys(swaggerSpec.components?.schemas || {}).length
  console.log(`OK   swagger spec paths=${paths} schemas=${schemas}`)
  if (paths < 50 || schemas < 50) {
    failures.push({ mod: 'swagger-size', message: 'unexpectedly small swagger' })
  }
} catch (e) {
  failures.push({ mod: 'swagger', message: e.message })
  console.log('FAIL swagger', e.message)
}

console.log('')
if (failures.length) {
  console.log('SUMMARY FAILED', failures.length)
  for (const f of failures) console.log(' -', f.mod, f.message || '')
  process.exit(1)
}

console.log('SUMMARY ALL PASSED')
