'use strict'
const { getProcessesOutputDTO } = require('../dto/ProcessOutput')
const { ProcessDefinition , Stage} = require('../entities')
const { createProcessDefinitionSchema } = require('../validations/processDefinition')
const { generateBPMN } = require('../engine/generateBPMN')
const axios = require('axios')
const {getProcesses} = require('../repositories/ProcessDef')


async function createProcessDefinitionService(data) {
  const { error } = createProcessDefinitionSchema.validate(data)
  if (error) throw new Error(error.details[0].message)

  const process = await ProcessDefinition.create({
    name: data.name,
    code: data.code || null,
    type_trans_id: data.type_trans_id,
    organization_id: data.organization_id || null,
    status: 'draft',
    version: 1,
    priority: data.priority

  })

  return process
}



//===========================================   deploy process    ==============================================

async function deployProcessDefinitionService(processDefinitionId) {

  // 1. جلب العملية + المراحل
const process = await ProcessDefinition.findByPk(processDefinitionId, {
include: [
  {
    model: Stage,
    as: 'stages',
    include: [
      {
        model: StageAssignment,
        as: 'stage_assignments',
        include: [
          {
            model: OrgDeptRole,
            as: 'organization_department_role'
          }
        ]
      },
      {
        model: StageConfig,
        as: 'stage_configs'   // 🔥 مهم جداً
      }
    ]
  }
]
})

  if (!process) throw new Error('ProcessDefinition غير موجود')

  // 🚨 1. CHECK PROCESS ACTIVE
  if (!process.is_active) {
    throw new Error('لا يمكن نشر عملية غير مفعّلة (Process is inactive)')
  }

  // 2. فلترة المراحل الفعّالة فقط
  const stages = process.stages
    .filter(s => s.is_active === true)
    .sort((a, b) => a.order - b.order)

  if (!stages.length)
    throw new Error('لا يوجد مراحل فعّالة لهذه العملية')

  // 3. توليد BPMN
  const bpmnXml = generateBPMN(process, stages)

  // 4. Deploy على Camunda
  const camundaResponse = await deployToCamunda(
    process.code || `process_${process.id}`,
    bpmnXml
  )

  // 5. تحديث DB
  process.camunda_process_key = process.code || `process_${process.id}`
  process.camunda_deployment_id = camundaResponse.deploymentId
  process.bpmn_xml = bpmnXml
  process.status = 'deployed'

  await process.save()

  return {
    process_definition_id: process.id,
    deployment_id: camundaResponse.deploymentId,
    process_key: process.camunda_process_key
  }
}
//// =========================================== get all available-processes for usser =======================================
async function getAllProcesses(user) {

  // 1. جيب كل أدوار المستخدم
  const userURAs = await UserRoleAssignment.findAll({
    where: {
      user_id: user.id,
      is_active: true
    }
  })

  if (!userURAs.length) {
    throw new Error('المستخدم غير مربوط بأي Role')
  }

  // 2. استخرج IDs
  const roleIds = userURAs.map(
    ura => ura.organization_department_role_id
  )

  // 3. جيب العمليات
  const processes =  getProcesses(roleIds)

  return processes.map(p => new getProcessesOutputDTO(p))
}



/////===========================================     start process with camunda     =========================================

async function startProcessInstanceService(data) {

  const { process_definition_id } = data

  // 1. جلب العملية + المراحل
  const process = await ProcessDefinition.findByPk(process_definition_id, {
    include: [{ model: Stage, as: 'stages' }]
  })

  if (!process) throw new Error('Process غير موجود')

  if (!process.is_active)
    throw new Error('لا يمكن تشغيل Process غير مفعل')

  // 2. تشغيل Camunda Process
  const camundaRes = await axios.post(
    `http://localhost:8080/engine-rest/process-definition/key/${process.camunda_process_key}/start`,
    {
      variables: {}
    }
  )

  const camundaInstanceId = camundaRes.data.id

  // 3. 🟢 مباشرة نجيب أول Task من Camunda
  const { data: tasks } = await axios.get(
    `${process.env.CAMUNDA_URL}/task?processInstanceId=${camundaInstanceId}`
  )

  const currentTask = tasks[0]

  if (!currentTask) {
    throw new Error('No active task found in Camunda')
  }

  // 4. 🟢 نربط Task مع Stage عبر code
  const currentStage = await Stage.findOne({
    where: {
      process_definition_id: process.id,
      code: currentTask.taskDefinitionKey
    }
  })

  if (!currentStage) {
    throw new Error('Stage غير معرف لهذا task')
  }

  // 5. إنشاء ProcessInstance في DB
  const instance = await ProcessInstance.create({
    process_definition_id: process.id,
    camunda_process_instance_id: camundaInstanceId,
    current_stage_id: currentStage.id,
    status: 'running'
  })

  return {
    process_instance_id: instance.id,
    camunda_process_instance_id: camundaInstanceId,

    // 🔥 مهم: هذا هو المصدر الحقيقي
    current_stage: currentStage,
    //من يلي فوق لح اخد ال id لساوي api يلي هو جيب StageConfig
    camunda_task_id: currentTask.id,
    task_definition_key: currentTask.taskDefinitionKey
  }
}

module.exports = { createProcessDefinitionService , deployProcessDefinitionService , getAllProcesses , startProcessInstanceService }