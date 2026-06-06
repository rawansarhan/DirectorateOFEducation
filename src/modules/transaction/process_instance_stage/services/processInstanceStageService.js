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
}) {
  return processInstanceStageRepository.create({
    transaction_id: transactionId,
    stage_code: stageCode,
    stage_name: stageName,
    status,
    data,
    assigned_to
  })
}

module.exports = {
  createProcessStage
}
