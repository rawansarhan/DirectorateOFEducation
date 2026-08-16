class StageConfigMapper {

  mapConfigs(results) {

    return results.map(r => ({
      stage_id: r.stage_id,
      config: r.config,
      assignments: Array.isArray(r.assignments) ? r.assignments : []
    }))
  }
}

module.exports =
  new StageConfigMapper()