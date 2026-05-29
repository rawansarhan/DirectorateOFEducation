const { ProcessInstance } = require('../../../../entities')

class ProcessInstanceRepository {
  getSequelize () {
    return ProcessInstance.sequelize
  }

  async create (data) {
    return ProcessInstance.create(data)
  }

  async update (id, data) {
    return ProcessInstance.update(data, { where: { id } })
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

  async findByCamundaId (camundaProcessInstanceId) {
    return ProcessInstance.findOne({
      where: { camunda_process_instance_id: camundaProcessInstanceId }
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
        task_lock_expires_at: null
      },
      { transaction }
    )
  }
}

module.exports = new ProcessInstanceRepository()
