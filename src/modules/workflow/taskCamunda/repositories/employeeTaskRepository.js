const { Op } =
  require('sequelize')

const db =
  require('../../../../entities')

// ======================================================
// GET USER ROLE IDS
// ======================================================

async function getUserRoleIds(userId) {

  const roles =
    await db.UserRoleAssignment.findAll({

      where: {

        user_id:
          userId,

        is_active:
          true
      },

      attributes: [
        'organization_department_roles_id'
      ]
    })

  return roles.map(

    role =>
      role.organization_department_roles_id
  )
}

// ======================================================
// GET STAGE IDS
// ======================================================

async function getStageIdsByRoles(roleIds) {

  const assignments =
    await db.StageAssignment.findAll({

      where: {

        organization_department_roles_id: {

          [Op.in]:
            roleIds
        }
      },

      attributes: [
        'stage_id'
      ]
    })

  return assignments.map(

    item =>
      item.stage_id
  )
}

// ======================================================
// GET PROCESS INSTANCES
// ======================================================

async function getRunningInstances(stageIds) {

  return db.ProcessInstance.findAll({

    where: {

      current_stage_id: {

        [Op.in]:
          stageIds
      },

      status:
        'running'
    },

    include: [

      // ================================================
      // CURRENT STAGE
      // ================================================

      {
        model: db.Stage,
        as: 'current_stage'
      },

      // ================================================
      // PROCESS
      // ================================================

      {
        model: db.ProcessDefinition,
        as: 'process_definition'
      },

      // ================================================
      // TRANSACTION
      // ================================================

      {
        model: db.Transaction,
        as: 'transaction'
      }
    ],

    order: [

      [
        {
          model: db.ProcessDefinition,
          as: 'process_definition'
        },
        'priority',
        'DESC'
      ],

      ['created_at', 'ASC']
    ]
  })
}

module.exports = {

  getUserRoleIds,
  getStageIdsByRoles,
  getRunningInstances
}