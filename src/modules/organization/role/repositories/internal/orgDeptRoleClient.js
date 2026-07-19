const {
  OrgDeptRole,
  Role,
  Organization,
  Department
} = require('../../../../../entities')
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
    ],
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'code']
      },
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ]
  })
}

async  findCitizenRole() {

  return await OrgDeptRole.findOne({
    where: {
      camunda_group_key: 'CITIZEN',
      is_active: true
    }
  })
}
}
module.exports =
  new OrgDeptRoleRepository()