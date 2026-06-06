class StageConfigMapper {

  mapConfigs(results) {

    return results.map(r => ({
      stage_id: r.stage_id,
      config: r.config
    }))
  }
}

module.exports =
  new StageConfigMapper()