module.exports = () => {

  // WORKFLOW
  require(
    '../../../modules/workflow/listeners/transaction.listener'
  )

  // TRANSACTION
  require(
    '../../../modules/transaction/listeners/processInstanceStage'
  )
}