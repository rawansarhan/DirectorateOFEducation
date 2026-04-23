 const { ProcessDefinition, Stage, StageConfig } = require('../entities')

 async function getProcesses(roleIds) {
 const processes = await ProcessDefinition.findAll({

    where: {
      is_active: true,
      status: 'deployed'
    },

    include: [
      {
        model: Stage,
        as: 'stages',
        required: true,

        where: {
          is_active: true,
          order: 1
        },

        include: [
          {
            model: StageAssignment,
            as: 'stage_assignments',
            required: true,

            where: {
              organization_department_role_id: roleIds // 🔥 IN
            },

            include: [
              {
                model: OrgDeptRole,
                as: 'organization_department_role'
              }
            ]
          }
        ]
      }
    ],

    order: [
      ['priority', 'ASC']
    ],

    distinct: true 

  })
return processes;
}

module.exports = { getProcesses }
