'use strict'

const {
  StageAssignment,
  OrgDeptRole,
  Organization,
  Department,
  Role
} = require('../../../../entities')

class StageAssignmentRepository {
  async findByStageIds (stageIds) {
    return StageAssignment.findAll({
      where: {
        stage_id: stageIds
      }
    })
  }

  async findDetailedByStageId (stageId) {
    return StageAssignment.findAll({
      where: { stage_id: stageId },
      include: [{
        model: OrgDeptRole,
        as: 'organization_department_role',
        required: true,
        where: { is_active: true },
        attributes: [
          'id',
          'organization_id',
          'department_id',
          'role_id',
          'camunda_group_key',
          'is_active'
        ],
        include: [
          {
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name']
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name']
          },
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'code']
          }
        ]
      }],
      order: [['id', 'ASC']]
    })
  }

  async bulkCreate (data) {
    return StageAssignment.bulkCreate(data)
  }
}

module.exports = new StageAssignmentRepository()
