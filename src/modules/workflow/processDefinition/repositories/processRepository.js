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

  _buildAuthProcessesQuery ({
    typeTransId = null,
    isComplaint = false,
    roleIds = null
  } = {}) {
    const assignmentInclude = {
      model: StageAssignment,
      as: 'stage_assignments',
      attributes: ['organization_department_roles_id']
    }

    if (Array.isArray(roleIds) && roleIds.length > 0) {
      assignmentInclude.where = {
        organization_department_roles_id: {
          [Op.in]: roleIds
        }
      }
      assignmentInclude.required = true
    } else {
      assignmentInclude.required = false
    }

    const where = {
      is_active: true,
      status: 'deployed',
      approval_status: 'APPROVED'
    }

    if (isComplaint) {
      where.is_complaint = true
    } else {
      where.type_trans_id = typeTransId
      where.is_complaint = false
    }

    return {
      where,

      attributes: ['id', 'name', 'code', 'priority', 'is_complaint'],

      include: [
        {
          model: Stage,
          as: 'stages',
          attributes: ['id', 'name', 'code', 'type', 'auth_type'],
          where: { auth_type: 'AUTH' },
          required: true,
          include: [assignmentInclude]
        }
      ],

      subQuery: false,
      distinct: true
    }
  }

  //================ AUTH optimized query ===
  async findAuthProcesses (typeTransId, roleIds) {
    return ProcessDefinition.findAll(
      this._buildAuthProcessesQuery({ typeTransId, roleIds })
    )
  }

  async findAuthProcessesForCache (typeTransId) {
    return ProcessDefinition.findAll(
      this._buildAuthProcessesQuery({ typeTransId, roleIds: null })
    )
  }

  async findAuthComplaintProcesses (roleIds) {
    return ProcessDefinition.findAll(
      this._buildAuthProcessesQuery({ isComplaint: true, roleIds })
    )
  }

  async findAuthComplaintProcessesForCache () {
    return ProcessDefinition.findAll(
      this._buildAuthProcessesQuery({ isComplaint: true, roleIds: null })
    )
  }

  async findProcessDetails (processId) {
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

  async findByCode (code) {
    return await ProcessDefinition.findOne({
      where: { code }
    })
  }

  async syncActivationByYearlySchedule (now = new Date()) {
    const { isProcessActiveBySchedule } = require('../utils/processActivation')

    const processes = await ProcessDefinition.findAll({
      where: {
        status: 'deployed',
        approval_status: 'APPROVED'
      },
      attributes: ['id', 'is_active', 'start_date', 'end_date']
    })

    let activated = 0
    let deactivated = 0

    for (const process of processes) {
      const shouldBeActive = isProcessActiveBySchedule(
        process.start_date,
        process.end_date,
        now
      )

      if (shouldBeActive && !process.is_active) {
        await ProcessDefinition.update(
          { is_active: true },
          { where: { id: process.id } }
        )
        activated += 1
      } else if (!shouldBeActive && process.is_active) {
        await ProcessDefinition.update(
          { is_active: false },
          { where: { id: process.id } }
        )
        deactivated += 1
      }
    }

    return { activated, deactivated }
  }

  /** @deprecated use syncActivationByYearlySchedule */
  async activateProcesses (now) {
    const { activated } = await this.syncActivationByYearlySchedule(now)
    return [activated]
  }

  /** @deprecated use syncActivationByYearlySchedule */
  async deactivateProcesses (now) {
    const { deactivated } = await this.syncActivationByYearlySchedule(now)
    return [deactivated]
  }

  async update (id, data) {
    return await ProcessDefinition.update(data, {
      where: { id }
    })
  }
}
module.exports = new ProcessRepository()