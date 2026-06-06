module.exports = () => {

  // WORKFLOW
  require(
    '../../../modules/workflow/listeners/transaction.listener'
  )

  // TRANSACTION
  require(
    '../../../modules/transaction/process_instance_stage/listeners/processInstanceStageListener'
  )
}