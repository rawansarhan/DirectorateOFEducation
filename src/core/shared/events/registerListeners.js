module.exports = () => {

  // WORKFLOW
  require(
    '../../../modules/workflow/listeners/transaction.listener'
  )

  require(
    '../../../modules/workflow/listeners/generatePdf.listener'
  )

  // TRANSACTION
  require(
    '../../../modules/transaction/process_instance_stage/listeners/processInstanceStageListener'
  )
}