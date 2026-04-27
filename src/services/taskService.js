const axios = require('axios')
const { runStage } = require('../engine/stageRunner')
const {
  Stage,
  StageAssignment,
  StageConfig,
  OrgDeptRole,
  ProcessInstance,
  UserRoleAssignment
} = require('../entities')
const crypto = require('crypto')
const { runValidation } = require('../engine/validationEngine')
const { Op } = require('sequelize')

//////
//**{
//   "task": {
//     "id": "123",
//     "name": "تعبئة طلب الإجازة",
//     "definitionKey": "leave_form"
//   },

//   "process_instance_id": 55,

//   "stage": {
//     "id": 10,
//     "name": "إدخال الطلب",
//     "type": "USER_TASK"
//   },

//   "form": {
//     "fields": [
//       { "name": "days", "type": "number" },
//       { "name": "reason", "type": "text" }
//     ],

//     "files": [
//       { "name": "attachment" }
//     ],

//     "ui": [
//       { "layout": "two_columns" }
//     ],

//     "rules": []
//   }
// } */


async function getTaskFormService(taskId, user) {

  // ==============================
  // 1. GET TASK FROM CAMUNDA
  // ==============================
  const { data: task } = await axios.get(
    `${process.env.CAMUNDA_URL}/task/${taskId}`
  )

  if (!task) {
    throw new Error('Task غير موجود')
  }

  // ==============================
  // 2. PARALLEL FETCH 🔥
  // ==============================
  const [instance, userURA] = await Promise.all([

    ProcessInstance.findOne({
      where: {
        camunda_process_instance_id: task.processInstanceId
      }
    }),

    UserRoleAssignment.findAll({
      where: {
        user_id: user.id,
        is_active: true
      }
    })

  ])

  if (!instance) {
    throw new Error('ProcessInstance غير موجود')
  }

  const userRoles = userURA.map(
    u => u.organization_department_roles_id
  )

  // ==============================
  // 3. GET STAGE + CONFIG + ASSIGNMENTS (ONE QUERY 🔥)
  // ==============================
  const stage = await Stage.findOne({
    where: {
      process_definition_id: instance.process_definition_id,
      code: task.taskDefinitionKey,
      is_active: true
    },
    include: [
      {
        model: StageConfig,
        as: 'stage_configs',
        where: { is_active: true },
        required: false
      },
      {
        model: StageAssignment,
        as: 'stage_assignments',
        required: true,
        where: {
          organization_department_roles_id: {
            [Op.in]: userRoles
          }
        }
      }
    ]
  })

  // 🔐 إذا ما رجع → يعني ما عنده صلاحية
  if (!stage) {
    throw new Error('غير مسموح لك تنفيذ هذه المهمة')
  }

  const configs = stage.stage_configs || []

  // ==============================
  // 4. BUILD FORM (NO EXTRA QUERIES)
  // ==============================
  return {
    task: {
      id: task.id,
      name: task.name,
      definitionKey: task.taskDefinitionKey
    },

    process_instance_id: instance.id,

    stage: {
      id: stage.id,
      name: stage.name,
      type: stage.type,
      code: stage.code
    },

    form: {
      fields: configs
        .filter(c => c.type === 'fields')
        .flatMap(c => c.config_json.fields || []),

      files: configs
        .filter(c => c.type === 'files')
        .flatMap(c => c.config_json.files || []),

      ui: configs
        .filter(c => c.type === 'ui')
        .flatMap(c => c.config_json.ui || []),

      rules: configs
        .filter(c => c.type === 'rules')
        .flatMap(c => c.config_json.rules || [])
    }
  }
}

//////////////////////////////////////////////////////////////////////////
// used when task completed 
/////////////////////////////////////////////////////////////////////////



async function completeTaskService(taskId, user, data) {

  // ==============================
  // 1. GET TASK FROM CAMUNDA
  // ==============================
  const { data: task } = await axios.get(
    `${process.env.CAMUNDA_URL}/task/${taskId}`
  )

  if (!task) {
    throw new Error('Task غير موجود')
  }

  // ==============================
  // 2. PARALLEL FETCH 🔥
  // ==============================
  const [instance, userURA] = await Promise.all([

    ProcessInstance.findOne({
      where: {
        camunda_process_instance_id: task.processInstanceId
      }
    }),

    UserRoleAssignment.findAll({
      where: {
        user_id: user.id,
        is_active: true
      }
    })

  ])

  if (!instance) {
    throw new Error('ProcessInstance غير موجود')
  }

  const roleIds = userURA.map(
    r => r.organization_department_roles_id
  )

  // ==============================
  // 3. GET STAGE + CONFIG + PERMISSIONS (ONE QUERY 🔥)
  // ==============================
  const stage = await Stage.findOne({
    where: {
      process_definition_id: instance.process_definition_id,
      code: task.taskDefinitionKey,
      is_active: true
    },
    include: [
      {
        model: StageConfig,
        as: 'stage_configs',
        where: { is_active: true },
        required: false
      },
      {
        model: StageAssignment,
        as: 'stage_assignments',
        required: true,
        where: {
          organization_department_roles_id: {
            [Op.in]: roleIds
          }
        }
      }
    ]
  })

  // إذا ما رجع stage → يعني ما عنده صلاحية
  if (!stage) {
    throw new Error('غير مسموح لك تنفيذ هذه المهمة')
  }

  // ==============================
  // 4. VALIDATION ENGINE
  // ==============================
  await runValidation(stage, data)

  // ==============================
  // 5. SIGNATURE CHECK
  // ==============================
  if (stage.type === 'APPROVAL') {
    await verifySignature(user, data)
  }

  // ==============================
  // 6. SEND TO CAMUNDA
  // ==============================
  await axios.post(
    `${process.env.CAMUNDA_URL}/task/${taskId}/complete`,
    {
      variables: {
        action: {
          value: data.action, // approve | reject | return
          type: 'String'
        },
        userId: {
          value: user.id,
          type: 'String'
        }
      }
    }
  )

  // ==============================
  // 7. UPDATE DB
  // ==============================
  await instance.update({
    last_action: data.action,
    updated_by: user.id
  })

  // ==============================
  // 8. RETURN
  // ==============================
  return {
    success: true,
    action: data.action
  }
}



function verifySignature (user, data) {
  const publicKey = user.public_key

  const verify = crypto.createVerify('SHA256')
  verify.write(data.payload)
  verify.end()

  const isValid = verify.verify(publicKey, data.signature, 'base64')

  if (!isValid) {
    throw new Error('Signature غير صحيحة')
  }
}
// =================================== Gat All Task For Employee =============================================
// {
//   "success": true,
//   "data": [
//     {
//       "task": {
//         "id": "123",
//         "name": "توقيع الطلب"
//       },
//       "stage": {
//         "name": "مدير الدائرة"
//       }
//     }
//   ],
//   "page": 1,
//   "limit": 10,
//   "total": 35,
//   "totalPages": 4
// }

//  http://localhost:8080/engine-rest/task?candidateGroupIn=group1,group2


async function getMyTasksService(user, query) {

  // =========================
  // 1. PAGINATION
  // =========================
  const page = parseInt(query.page || 1)
  const limit = parseInt(query.limit || 10)
  const offset = (page - 1) * limit

  // =========================
  // 2. GET USER ROLES
  // =========================
  const userRoles = await UserRoleAssignment.findAll({
    where: {
      user_id: user.id,
      is_active: true
    },
    attributes: ['organization_department_roles_id']
  })

  const roleIds = userRoles.map(r => r.organization_department_roles_id)

  if (!roleIds.length) {
    return { data: [], page, limit, total: 0, totalPages: 0 }
  }

  // =========================
  // 3. GET CAMUNDA GROUPS
  // =========================
  const roles = await OrgDeptRole.findAll({
    where: {
      id: {
        [Op.in]: roleIds
      }
    },
    attributes: ['camunda_group_key']
  })

  const candidateGroups = [
    ...new Set(
      roles.map(r => r.camunda_group_key).filter(Boolean)
    )
  ]

  if (!candidateGroups.length) {
    return { data: [], page, limit, total: 0, totalPages: 0 }
  }

  // =========================
  // 4. GET TASKS FROM CAMUNDA
  // =========================


const groupsQuery = candidateGroups.join(',')

const { data: tasks } = await axios.get(
  `${process.env.CAMUNDA_URL}/task?candidateGroupIn=${groupsQuery}`
)

if (!tasks.length) {
  return { data: [], page, limit, total: 0, totalPages: 0 }
}

  // =========================
  // 5. BULK FETCH INSTANCES
  // =========================
  const instanceIds = [
    ...new Set(tasks.map(t => t.processInstanceId))
  ]

  const instances = await ProcessInstance.findAll({
    where: {
      camunda_process_instance_id: {
        [Op.in]: instanceIds
      }
    }
  })

  const instanceMap = new Map(
    instances.map(i => [i.camunda_process_instance_id, i])
  )

  // =========================
  // 6. BULK FETCH STAGES
  // =========================
  const stageCodes = [...new Set(tasks.map(t => t.taskDefinitionKey))]

  const processIds = [
    ...new Set(instances.map(i => i.process_definition_id))
  ]

  const stages = await Stage.findAll({
    where: {
      code: {
        [Op.in]: stageCodes
      },
      process_definition_id: {
        [Op.in]: processIds
      },
      is_active: true
    }
  })

  const stageMap = new Map(
    stages.map(s => [s.code, s])
  )

  // =========================
  // 7. 🔥 BULK FETCH PROCESS DEFINITIONS
  // =========================
  const processDefinitions = await ProcessDefinition.findAll({
    where: {
      id: {
        [Op.in]: processIds
      }
    },
    attributes: ['id', 'priority']
  })

  const processMap = new Map(
    processDefinitions.map(p => [p.id, p])
  )

  // =========================
  // 8. BUILD RESULT
  // =========================
  const result = []

  for (const task of tasks) {

    const instance = instanceMap.get(task.processInstanceId)
    if (!instance) continue

    const stage = stageMap.get(task.taskDefinitionKey)
    if (!stage) continue

    const process = processMap.get(instance.process_definition_id)

    result.push({
      task: {
        id: task.id,
        name: task.name,
        definitionKey: task.taskDefinitionKey,
        created: task.created
      },

      stage: {
        id: stage.id,
        name: stage.name,
        type: stage.type
      },

      process_instance_id: instance.id,

      // 🔥 priority للترتيب
      priority: process?.priority || 0
    })
  }

  // =========================
  // 9. 🔥 SORT BY PRIORITY + DATE
  // =========================
  result.sort((a, b) => {

    // أول شي priority
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }

    // إذا نفس الشي → الأحدث أولاً
    return new Date(b.task.created) - new Date(a.task.created)
  })

  // =========================
  // 10. PAGINATION
  // =========================
  const total = result.length
  const paginated = result.slice(offset, offset + limit)

  // (اختياري) حذف priority من response
  const cleanData = paginated.map(({ priority, ...rest }) => rest)

  // =========================
  // 11. RESPONSE
  // =========================
  return {
    data: cleanData,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}



module.exports = { getTaskFormService, getMyTasksService, completeTaskService }
