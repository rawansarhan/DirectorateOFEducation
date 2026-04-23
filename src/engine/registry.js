const validateFields = require('./handlers/CalculationsHandler')
const validateFiles = require('./handlers/DocumentHandler')
const validateUI = require('./handlers/DecisionHandler')

//registry (Factory)

const handlers = {
  fields: validateFields,
  files: validateFiles,
  ui: validateUI
}
module.exports = handlers