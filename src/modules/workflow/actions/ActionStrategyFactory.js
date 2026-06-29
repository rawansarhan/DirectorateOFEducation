const SendNotificationStrategy =
  require('./strategies/SendNotificationStrategy')


  
const GenPDFtrategy =
  require('./strategies/GeneratePDF')

class ActionStrategyFactory {
  static make (action) {
    switch (action) {
      case 'SEND_NOTIFICATION':
        return new SendNotificationStrategy()
      case 'GENERATE_PDF':
        return new GenPDFtrategy()

      default:
        throw new Error(`Unsupported action ${action}`)
    }
  }
}

module.exports = ActionStrategyFactory
