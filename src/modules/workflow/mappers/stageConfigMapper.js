class StageConfigMapper {

  mapConfigs(results) {

    return results.map(r => ({
      stage_id: r.stage_id,
      config: r.config,
      ui: r.ui
    }))
  }
}

module.exports =
  new StageConfigMapper()