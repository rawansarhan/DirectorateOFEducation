class WorkflowGraph {

  constructor(stages = [], transitions = []) {

    this.nodes = new Map()
    this.edges = new Map()

    // build nodes
    stages.forEach(s => {
      this.nodes.set(s.code, s)
      this.edges.set(s.code, [])
    })

    // build edges
    transitions.forEach(t => {
      if (!this.edges.has(t.from_stage_code)) return

      this.edges.get(t.from_stage_code).push({
        action: t.action,
        to: t.to_stage_code,
        condition: t.condition || null
      })
    })
  }

  /**
   * Resolve next node
   */
  next(currentCode, action, context = {}) {

    const edges = this.edges.get(currentCode) || []

    // 1. match by action
    let route = edges.find(e => e.action === action)

    if (!route) {
      throw new Error(`No route from ${currentCode} for action ${action}`)
    }

    // 2. condition support
    if (route.condition) {
      const ok = this.eval(route.condition, context)
      if (!ok) {
        throw new Error(`Condition failed`)
      }
    }

    return route.to
  }

  eval(condition, ctx) {
    return new Function(
      ...Object.keys(ctx),
      `return ${condition}`
    )(...Object.values(ctx))
  }
}

module.exports = { WorkflowGraph }