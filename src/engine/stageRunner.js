const handlers = require('./registry')

async function runStage(context, inputData) {

  const configs = context.stage.stage_configs

  for (const config of configs) {

    const handler = handlers[config.type]
    if (!handler) continue

    const result = await handler.execute(config, inputData, context)

    if (result) return result
  }

  return null // ما عاد نحدد next stage هون ❌
}

module.exports = { runStage }