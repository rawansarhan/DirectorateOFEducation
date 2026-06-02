class GenPDFStrategy {
  async execute ({ payload, context }) {
    return {
      type: 'GENERATE_PDF',
      status: 'delegated_to_frontend',
      message: 'PDF generation is handled by the frontend',
      payload
    }
  }
}

module.exports = GenPDFStrategy
