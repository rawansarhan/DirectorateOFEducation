'use strict'

class getProcessesOutputDTO {
  constructor(process) {

    // 🔹 بيانات العملية الأساسية
    this.id = process.id
    this.name = process.name
    this.code = process.code
    this.priority = process.priority

    // 🔹 أول مرحلة فقط
    const firstStage = process.stages?.[0]

    if (firstStage) {
      this.first_stage = {
        id: firstStage.id,
        name: firstStage.name,
        code: firstStage.code,
        type: firstStage.type,
        order: firstStage.order
      }

      // 🔹 roles المرتبطة بأول مرحلة
      this.roles = firstStage.stage_assignments?.map(a => ({
        id: a.organization_department_role?.id,
        name: a.organization_department_role?.name,
        key: a.organization_department_role?.camunda_group_key
      })) || []
    } else {
      this.first_stage = null
      this.roles = []
    }

  }
}

module.exports ={getProcessesOutputDTO} 