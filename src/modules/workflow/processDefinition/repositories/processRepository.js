const {
  ProcessDefinition,
  Stage,
  StageAssignment,
  StageConfig,
  TypeTrans
} = require('../../../../entities')
const { Op, QueryTypes } = require('sequelize')

const db = require('../../../../entities')

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
    allTypes = false,
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
    } else if (allTypes) {
      where.is_complaint = false
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

  async findAllAuthProcessesForCache () {
    return ProcessDefinition.findAll(
      this._buildAuthProcessesQuery({ allTypes: true, roleIds: null })
    )
  }

  async findUnapprovedOrInactiveProcesses () {
    return db.sequelize.query(
      `
      SELECT
        pd.id,
        pd.name,
        pd.approval_status,
        pd.is_active,
        pd.updated_at
      FROM process_definitions pd
      WHERE (
        pd.approval_status != 'APPROVED'
        OR pd.is_active = false
      )
      AND EXISTS (
        SELECT 1
        FROM stages s
        WHERE s.process_definition_id = pd.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM stages s
        LEFT JOIN stage_configs sc ON sc.stage_id = s.id
        WHERE s.process_definition_id = pd.id
          AND sc.id IS NULL
      )
      ORDER BY pd.updated_at DESC
      `,
      { type: QueryTypes.SELECT }
    )
  }

  async findProcessesWithMissingStageConfig () {
    return db.sequelize.query(
      `
      SELECT
        pd.id,
        pd.name,
        pd.approval_status,
        pd.is_active,
        pd.updated_at,
        (
          SELECT COUNT(*)::int
          FROM stages s
          WHERE s.process_definition_id = pd.id
        ) AS stages_total_count,
        (
          SELECT COUNT(*)::int
          FROM stages s
          LEFT JOIN stage_configs sc ON sc.stage_id = s.id
          WHERE s.process_definition_id = pd.id
            AND sc.id IS NULL
        ) AS stages_missing_config_count
      FROM process_definitions pd
      WHERE NOT EXISTS (
        SELECT 1
        FROM stages s
        WHERE s.process_definition_id = pd.id
      )
      OR EXISTS (
        SELECT 1
        FROM stages s
        LEFT JOIN stage_configs sc ON sc.stage_id = s.id
        WHERE s.process_definition_id = pd.id
          AND sc.id IS NULL
      )
      ORDER BY pd.updated_at DESC
      `,
      { type: QueryTypes.SELECT }
    )
  }

  _buildProcessesByTypeQuery ({
    typeTransId = null,
    allTypes = false,
    activeOnly = true,
    approvedOnly = false
  } = {}) {
    const where = {
      is_complaint: false
    }

    if (activeOnly) {
      where.is_active = true
    }

    if (approvedOnly) {
      where.approval_status = 'APPROVED'
    }

    if (!allTypes) {
      where.type_trans_id = typeTransId
    }

    return {
      where,
      attributes: [
        'id',
        'name',
        'code',
        'priority',
        'status',
        'approval_status',
        'is_active'
      ],
      order: [['priority', 'ASC'], ['id', 'ASC']]
    }
  }

  /** GET /type/:id — نشطة فقط (السلوك السابق) */
  async findProcessesByType (typeTransId) {
    return ProcessDefinition.findAll(
      this._buildProcessesByTypeQuery({ typeTransId, activeOnly: true })
    )
  }

  async findAllProcessesByTypeActive () {
    return ProcessDefinition.findAll(
      this._buildProcessesByTypeQuery({ allTypes: true, activeOnly: true })
    )
  }

  /**
   * GET /admin/type/:id —
   * معتمدة فقط (approval_status=APPROVED) سواء is_active true أو false
   */
  async findProcessesByTypeForAdmin (typeTransId) {
    return ProcessDefinition.findAll(
      this._buildProcessesByTypeQuery({
        typeTransId,
        activeOnly: false,
        approvedOnly: true
      })
    )
  }

  async findAllProcessesForAdmin () {
    return ProcessDefinition.findAll(
      this._buildProcessesByTypeQuery({
        allTypes: true,
        activeOnly: false,
        approvedOnly: true
      })
    )
  }

  async findComplaintProcessesForAdmin ({ activeOnly = false } = {}) {
    const where = { is_complaint: true }

    if (activeOnly) {
      where.is_active = true
    }

    return ProcessDefinition.findAll({
      where,
      attributes: [
        'id',
        'name',
        'code',
        'priority',
        'status',
        'approval_status',
        'is_active',
        'is_complaint'
      ],
      order: [['priority', 'ASC'], ['id', 'ASC']]
    })
  }

  async existsActiveComplaintProcess () {
    const row = await ProcessDefinition.findOne({
      where: {
        is_complaint: true,
        is_active: true
      },
      attributes: ['id', 'name', 'code']
    })

    return row
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
            'code',
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

  async findByCodeWithType (code) {
    return await ProcessDefinition.findOne({
      where: { code },
      include: [
        {
          model: TypeTrans,
          as: 'type_trans',
          attributes: ['id', 'name', 'code']
        }
      ]
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

  async forceDeleteById (id, options = {}) {
    return ProcessDefinition.destroy({
      where: { id },
      force: true,
      ...options
    })
  }
}
module.exports = new ProcessRepository()