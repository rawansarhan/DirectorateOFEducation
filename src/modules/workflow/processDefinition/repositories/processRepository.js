const {
  ProcessDefinition,
  Stage,
  StageAssignment,
  StageConfig
} = require('../../../../entities')
const { Op } = require('sequelize')

class ProcessRepository {

  //================ create =================
  async create(data) {
    return await ProcessDefinition.create(data)
  }

  //================ find by id =============
  async findById(id) {
    return await ProcessDefinition.findByPk(id)
  }

  //================ AUTH optimized query ===
  async findAuthProcesses(typeTransId, roleIds) {

    return await ProcessDefinition.findAll({

  where: {
    is_active: true,
    type_trans_id: typeTransId,
    status: 'deployed',
    approval_status: 'APPROVED'
  },

  attributes: ['id', 'name', 'code', 'priority'],

  include: [
    {
      model: Stage,
      as: 'stages',
      attributes: ['id', 'name', 'code', 'type', 'auth_type'],
      where: { auth_type: 'AUTH' },
      required: true,

      include: [
        {
          model: StageAssignment,
          as: 'stage_assignments',
          attributes: ['organization_department_roles_id'],
          where: {
            organization_department_roles_id: {
              [Op.in]: roleIds
            }
          },
          required: true
        }
      ]
    }
  ],

  subQuery: false,

  distinct: true,   // 🔥 مهم جدًا
})
}

///////////////////////////////////////////////////////////////
//====================== find process details =================

async findProcessDetails(processId) {

  return await ProcessDefinition.findByPk(processId, {

    attributes: [
      'id',
      'name',
      'code',
      'status',
      'version',
      'is_active',
      'approval_status',
      'start_date',
      'end_date'
    ],

    include: [
      {
        model: Stage,
        as: 'stages',

        attributes: [
          'id',
          'name',
          'type',
          'auth_type'
        ],

        include: [
          {
            model: StageConfig,
            as: 'stage_config',

            attributes: [
              'config_json'
            ]
          },

          {
            model: StageAssignment,
            as: 'stage_assignments',

            attributes: [
              'organization_department_roles_id'
            ]
          }
        ]
      }
    ],

    order: [
      [{ model: Stage, as: 'stages' }, 'id', 'ASC']
    ],

    subQuery: false
  })
}
///////////////////////////////////////////////////////////////////////////////
//================================  find  by code ============================

async findByCode(code) {

  return await ProcessDefinition.findOne({
    where: { code }
  })
}

//////////////////////////////////////////////////////////////////////////////
//==============================

async activateProcesses(now) {

  return await ProcessDefinition.update(

    {
      is_active: true
    },

    {
      where: {

        status: 'deployed',

        approval_status: 'APPROVED',

        is_active: false,

        start_date: {
          [Op.lte]: now
        }
      }
    }
  )
}

async deactivateProcesses(now) {

  return await ProcessDefinition.update(

    {
      is_active: false
    },

    {
      where: {

        status: 'deployed',

        is_active: true,

        end_date: {
          [Op.lt]: now
        }
      }
    }
  )
}


/////////////////////////////////////////////////////////////////////////////
async update (id, data) {
  return await ProcessDefinition.update(data, {
    where: { id }
  })
}

}
module.exports = new ProcessRepository()