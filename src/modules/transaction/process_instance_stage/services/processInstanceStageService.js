'use strict'

const processInstanceStageRepository =
  require('../repositories/processInstanceStageRepository')

async function createProcessStage ({
  transactionId,
  stageCode,
  stageName,
  status,
  data,
  assigned_to
}, { transaction: dbTransaction } = {}) {
  return processInstanceStageRepository.create({
    transaction_id: transactionId,
    stage_code: stageCode,
    stage_name: stageName,
    status,
    data,
    assigned_to
  }, dbTransaction)
}

module.exports = {
  createProcessStage
}
