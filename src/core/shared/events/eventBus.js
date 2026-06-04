class EventBus {
  constructor () {
    this.handlers = {}
  }

  subscribe (event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }

    this.handlers[event].push(handler)
  }

  async dispatch (event, payload) {
    const handlers = this.handlers[event] || []

    if (!handlers.length) {
      throw new Error(`No handlers registered for event: ${event}`)
    }

    console.log(`📢 EVENT: ${event}`)

    for (const handler of handlers) {
      await handler(payload)
    }
  }

  async publish (event, payload) {
    await this.dispatch(event, payload)
  }
}

module.exports = new EventBus()
