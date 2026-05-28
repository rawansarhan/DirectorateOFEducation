class GenPDFStrategy {

  async execute({ payload, context }) {

    return {
      type: 'email',
      status: 'queued',
      payload
    }
  }
}

module.exports = GenPDFStrategy