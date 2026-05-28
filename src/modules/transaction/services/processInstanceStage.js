const processInstanceStageRepository =
  require('../repositories/processInstanceStageRepository')

// =====================================
// CREATE PROCESS STAGE
// =====================================

async function createProcessStage({

  transactionId,

  stageCode,

  stageName,

  status,

  data,

  assigned_to

}) {

  return await processInstanceStageRepository.create({

    transaction_id: transactionId,

    stage_code: stageCode,

    stage_name: stageName,

    status,
    
    data: data ,
     
    assigned_to: assigned_to
  })
}

module.exports = {
  createProcessStage
}