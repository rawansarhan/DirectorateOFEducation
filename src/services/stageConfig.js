'use strict'

const { StageConfig, Stage } = require('../entities')
const { createStageConfigSchema } = require('../validations/stageConfigValidation')
// شكل الtransitions {
//   "transitions": [
//     { "action": "approve", "next_stage": "stage_2" },
//     { "action": "reject", "next_stage": "rejected" },
//     { "action": "return", "next_stage": "stage_1" }
//   ]
// } 
//الnext_stage هية نفسها ال code تبع ال stage 

function validateStageConfig(stageType, configType) {
const map = {
  USER_TASK: ['fields', 'files', 'ui'],
  APPROVAL: ['fields', 'ui'],
  DOCUMENT: ['document'],
  UPLOAD: ['files'],
  DECISION: ['rules'],
  NOTIFICATION: ['ui']
}

  if (!map[stageType].includes(configType)) {
    throw new Error('هذا النوع غير مسموح لهذه المرحلة')
  }
}

async function createStageConfigService(data) {

  const { error } = createStageConfigSchema.validate(data)
  if (error) throw new Error(error.details[0].message)

  // 1. جيب المرحلة
  const stage = await Stage.findByPk(data.stage_id)
  if (!stage) throw new Error('المرحلة غير موجودة')

  // 2. تحقق النوع
  validateStageConfig(stage.type, data.type)

  // 3. منع تكرار
  const exists = await StageConfig.findOne({
    where: {
      stage_id: data.stage_id,
      type: data.type
    }
  })

  if (exists) {
    throw new Error('هذا النوع موجود مسبقاً لهذه المرحلة')
  }

  // 🔥 4. تحقق transitions / rules
  if (data.type === 'transitions') {
    await validateTransitions(stage, data.config_json)
  }

  if (data.type === 'rules') {
    await validateRules(stage, data.config_json)
  }

  // 5. إنشاء
  const config = await StageConfig.create({
    stage_id: data.stage_id,
    type: data.type,
    config_json: data.config_json,
    priority: data.priority || 1,
  })

  return config
}
async function validateTransitions(stage, configJson) {

  const transitions = configJson.transitions

  if (!Array.isArray(transitions) || !transitions.length) {
    throw new Error('transitions يجب أن تحتوي على عناصر')
  }

  // =========================
  // 🔥 BULK FETCH STAGES ONCE
  // =========================
  const stages = await Stage.findAll({
    where: {
      process_definition_id: stage.process_definition_id
    },
    attributes: ['code']
  })

  const validCodes = new Set(stages.map(s => s.code))

  // =========================
  // VALIDATION (NO DB CALLS)
  // =========================
  for (const t of transitions) {

    if (!t.action) {
      throw new Error('action مطلوب في transitions')
    }

    if (!t.next_stage) {
      throw new Error('next_stage مطلوب')
    }

    if (!validCodes.has(t.next_stage)) {
      throw new Error(`Stage غير موجود: ${t.next_stage}`)
    }

    if (t.next_stage === stage.code) {
      throw new Error('لا يمكن الانتقال لنفس المرحلة')
    }
  }
}
async function validateRules(stage, configJson) {

  const rules = configJson.rules

  if (!Array.isArray(rules) || !rules.length) {
    throw new Error('rules يجب أن تحتوي على عناصر')
  }

  // =========================
  // 🔥 BULK FETCH STAGES ONCE
  // =========================
  const stages = await Stage.findAll({
    where: {
      process_definition_id: stage.process_definition_id
    },
    attributes: ['code']
  })

  const validCodes = new Set(stages.map(s => s.code))

  // =========================
  // VALIDATION (NO DB CALLS)
  // =========================
  for (const r of rules) {

    if (!r.condition) {
      throw new Error('condition مطلوب في rules')
    }

    if (!r.next_stage) {
      throw new Error('next_stage مطلوب في rules')
    }

    if (!validCodes.has(r.next_stage)) {
      throw new Error(`Stage غير موجود في rules: ${r.next_stage}`)
    }
  }
}


module.exports = { createStageConfigService }