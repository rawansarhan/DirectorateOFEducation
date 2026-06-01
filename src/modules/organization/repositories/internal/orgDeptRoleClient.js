const { OrgDeptRole, Role } = require('../../../../entities')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
class OrgDeptRoleRepository {

//////////////////////////////////////////////////

  async findById(id){
    return await OrgDeptRole.findByPk(id)
  }

//////////////////////////////////////////////////

  async findActive() {

    return await OrgDeptRole.findAll({

      where: {
        is_active: true
      },

      attributes: [
        'id',
        'organization_id',
        'department_id',
        'role_id'
      ]
    })
  }


///////////////////////////////////////////////////
async findOne(data) {
  const { Op } = require('sequelize')

  const where = {
    role_id: data.role_id,
    is_active: true
  }

  // organization
  if (data.organization_id === null || data.organization_id === undefined) {
    where.organization_id = { [Op.is]: null }
  } else {
    where.organization_id = data.organization_id
  }

  // department
  if (data.department_id === null || data.department_id === undefined) {
    where.department_id = { [Op.is]: null }
  } else {
    where.department_id = data.department_id
  }

  return await OrgDeptRole.findOne({ where })
}

////////////////////////////////////////////////////////////////////


async findAllByIds(ids) {

  return await OrgDeptRole.findAll({

    where: {

      id: {
        [Op.in]: ids
      }
    },

    attributes: [
      'id',
      'organization_id',
      'department_id',
      'role_id',
      'is_active'
    ]
  })
}

async findCitizenRole () {
  return await OrgDeptRole.findOne({
    where: {
      organization_id: null,
      department_id: null,
      is_active: true
    },
    include: [
      {
        model: Role,
        as: 'role',
        where: { code: 'CITIZEN' },
        required: true,
        attributes: ['id', 'code', 'name']
      }
    ],
    attributes: ['id', 'role_id', 'organization_id', 'department_id', 'camunda_group_key']
  })
}
}
module.exports =
  new OrgDeptRoleRepository()