'use strict'

const {
  Stage,
  StageAssignment,
  OrgDeptRole,
  ProcessDefinition
} = require('../entities')

const { createStageSchema } = require('../validations/stageValidation')

async function createStageService(data) {

  // 1. validation
  const { error } = createStageSchema.validate(data)
  if (error) throw new Error(error.details[0].message)

  // 2. check duplicate stage code
  const exists = await Stage.findOne({
    where: {
      process_definition_id: data.process_definition_id,
      code: data.code
    }
  })

  if (exists) {
    throw new Error('الكود مستخدم مسبقاً ضمن نفس المعاملة')
  }

  // 3. create stage
  const stage = await Stage.create({
    process_definition_id: data.process_definition_id,
    name: data.name,
    code: data.code,
    type: data.type,
    order: data.order
  })

  // 🔥 إذا ما في assignment خلص
  if (!data.organization_department_role_id) {
    return stage
  }

  // 4. check process
  const processDefinition = await ProcessDefinition.findByPk(
    data.process_definition_id
  )

  if (!processDefinition) {
    throw new Error('ProcessDefinition غير موجود')
  }

  // 5. get ODR
  const orgDeptRole = await OrgDeptRole.findByPk(
    data.organization_department_role_id
  )

  if (!orgDeptRole) {
    throw new Error('ODR غير موجود')
  }

  if (!orgDeptRole.camunda_group_key) {
    throw new Error('ODR لازم يحتوي camunda_group_key')
  }

  // 6. create assignment
  const stageAssignment = await StageAssignment.create({
    stage_id: stage.id,
    organization_department_role_id: orgDeptRole.id
  })

  // 7. return clean response
  return {
    id: stage.id,
    name: stage.name,
    code: stage.code,
    type: stage.type,
    order: stage.order,

    assignment: {
      odr_id: orgDeptRole.id,
      camunda_group: orgDeptRole.camunda_group_key
    }
  }
}

module.exports = { createStageService }