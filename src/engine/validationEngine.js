const validateFields = require('../engine/handlers/validateFields');
const validateFiles = require('../engine/handlers/validateFiles')
async function runValidation(stage, inputData) {

  const configs = stage.stage_configs

  for (const config of configs) {

     if (config.type === 'fields') {
      await validateFields(config, inputData)
    }

    if (config.type === 'files') {
      await validateFiles(config, inputData)
    }

    if (config.type === 'ui') {
      await validateUI(config, inputData)
    }

  }
}

module.exports = {runValidation }
