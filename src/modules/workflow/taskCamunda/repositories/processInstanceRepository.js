'use strict'

const db = require('../../../../entities')
const { ProcessInstance } = db

class ProcessInstanceRepository {
  getSequelize () {
    return ProcessInstance.sequelize
  }

  async create (data, dbTransaction = null) {
    return ProcessInstance.create(data, { transaction: dbTransaction })
  }

  async update (id, data, dbTransaction = null) {
    return ProcessInstance.update(data, { where: { id }, transaction: dbTransaction })
  }

  async findById (id) {
    return ProcessInstance.findByPk(id)
  }

  async findByIdWithLock (id, transaction) {
    return ProcessInstance.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
  }

  async findByCamundaId (camundaProcessInstanceId, dbTransaction = null) {
    return ProcessInstance.findOne({
      where: { camunda_process_instance_id: camundaProcessInstanceId },
      transaction: dbTransaction
    })
  }

  /**
   * Process instance + definition, transaction/user, current stage config.
   * Used by task details and similar read paths.
   */
  async findByCamundaIdWithDetails (camundaProcessInstanceId) {
    return ProcessInstance.findOne({
      where: {
        camunda_process_instance_id: camundaProcessInstanceId
      },
      include: [
        {
          model: db.ProcessDefinition,
          as: 'process_definition',
          attributes: ['id', 'name', 'priority', 'code']
        },
        {
          model: db.Transaction,
          as: 'transaction',
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: [
                'id',
                'phone_number',
                'first_name',
                'father_name',
                'last_name'
              ]
            }
          ]
        },
        {
          model: db.Stage,
          as: 'current_stage',
          include: [
            {
              model: db.StageConfig,
              as: 'stage_config',
              attributes: ['id', 'stage_id', 'config_json']
            }
          ]
        }
      ]
    })
  }

  async findByTransactionId (transactionId, dbTransaction = null) {
    return ProcessInstance.findOne({
      where: { transaction_id: transactionId },
      transaction: dbTransaction
    })
  }

  async updateInstance (instance, data, transaction) {
    return instance.update(data, { transaction })
  }

  async clearTaskLock (instance, transaction) {
    return instance.update(
      {
        task_lock_user_id: null,
        task_lock_task_id: null,
        task_locked_at: null,
        task_lock_expires_at: null,
        task_locks: {}
      },
      { transaction }
    )
  }

  async updateTaskLocks (instance, taskLocks, transaction) {
    const {
      syncLegacyLockColumns
    } = require('../utils/processInstanceTaskLocks')

    return instance.update(
      {
        task_locks: taskLocks,
        ...syncLegacyLockColumns(taskLocks)
      },
      { transaction }
    )
  }
}

module.exports = new ProcessInstanceRepository()
