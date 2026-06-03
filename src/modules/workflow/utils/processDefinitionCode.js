'use strict'

/**
 * Business code for process_definitions — not user input.
 * Example: id=12, version=1 → process-12-v1
 */
function buildProcessDefinitionCode (id, version = 1) {
  return `process-${id}-v${version}`
}

module.exports = {
  buildProcessDefinitionCode
}
