const SendNotificationStrategy =
  require('./strategies/SendNotificationStrategy')


  const SendEmailStrategy =
  require('./strategies/sendEmailStrategy')
const GenPDFtrategy =
  require('./strategies/GeneratePDF')

class ActionStrategyFactory {
  static make (action) {
    switch (action) {
      case 'SEND_EMAIL':
        return new SendEmailStrategy()
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
