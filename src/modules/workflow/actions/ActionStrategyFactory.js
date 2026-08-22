const SendNotificationStrategy =
  require('./strategies/SendNotificationStrategy')

const GenPDFtrategy =
  require('./strategies/GeneratePDF')

const SyncSelfCardStrategy =
  require('./strategies/SyncSelfCardStrategy')

class ActionStrategyFactory {
  static make (action) {
    switch (action) {
      case 'SEND_NOTIFICATION':
        return new SendNotificationStrategy()
      case 'GENERATE_PDF':
        return new GenPDFtrategy()
      case 'SYNC_SELF_CARD':
        return new SyncSelfCardStrategy()

      default:
        throw new Error(`Unsupported action ${action}`)
    }
  }
}

module.exports = ActionStrategyFactory
