'use strict'

const {
  User,
  UserRoleAssignment,
  OrgDeptRole
} = require('../../../../entities')
const { sendAndPersistNotification } = require('../../../transaction/notification/services/notificationService')

function isAuthNotificationTarget (payload, orgDeptRole) {
  const targetKey = payload.to_organization_department_roles_camunda_group_key

  if (targetKey === 'AUTH') {
    return true
  }

  return orgDeptRole?.camunda_group_key === 'AUTH'
}

async function resolveNotificationRecipients (payload, context) {
  const roleId = payload.to_organization_department_roles_id
  let orgDeptRole = null

  if (roleId) {
    orgDeptRole = await OrgDeptRole.findByPk(roleId, {
      attributes: ['id', 'camunda_group_key']
    })

    if (!orgDeptRole) {
      throw new Error(
        `organization_department_roles_id ${roleId} not found`
      )
    }
  }

  if (isAuthNotificationTarget(payload, orgDeptRole)) {
    if (!context.transaction?.user_id) {
      throw new Error('Transaction owner not found')
    }

    const owner = await User.findOne({
      where: {
        id: context.transaction.user_id,
        is_active: true
      },
      attributes: ['id', 'userName', 'email']
    })

    return {
      targetType: 'transaction_owner',
      organization_department_roles_id: roleId || null,
      camunda_group_key:
        payload.to_organization_department_roles_camunda_group_key ||
        orgDeptRole?.camunda_group_key ||
        'AUTH',
      users: owner ? [owner] : []
    }
  }

  if (!roleId) {
    throw new Error(
      'SEND_NOTIFICATION payload requires to (organization_department_roles_id) or to_camunda_group_key=AUTH'
    )
  }

  const assignments = await UserRoleAssignment.findAll({
    where: {
      organization_department_roles_id: roleId,
      is_active: true
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'userName', 'email'],
      where: { is_active: true },
      required: true
    }]
  })

  return {
    targetType: 'role_members',
    organization_department_roles_id: roleId,
    camunda_group_key: orgDeptRole?.camunda_group_key || null,
    users: assignments.map(item => item.user).filter(Boolean)
  }
}

class SendNotificationStrategy {
  async execute ({ payload, context }) {
    const message = String(payload.message || '').trim()
    const title = payload.title || payload.subject || 'إشعار من نظام المعاملات'
    const notificationType = payload.type || 'workflow_notification'

    if (!message) {
      throw new Error('SEND_NOTIFICATION payload.message is required')
    }

    const target = await resolveNotificationRecipients(payload, context)

    if (!target.users.length) {
      return {
        type: 'notification',
        channel: 'firebase',
        status: 'skipped',
        reason: 'No active users found for notification target',
        targetType: target.targetType,
        organization_department_roles_id: target.organization_department_roles_id,
        camunda_group_key: target.camunda_group_key,
        sent: 0,
        notifications: []
      }
    }

    const pushData = {
      type: notificationType,
      transactionId: String(context.transaction?.id || ''),
      idProcess: context.transaction?.id_process || '',
      stageCode: context.stage?.code || '',
      stageName: context.stage?.name || '',
      targetType: target.targetType,
      camundaGroupKey: target.camunda_group_key || '',
      processInstanceId: String(context.processInstance?.id || '')
    }

    const deliveryResults = []
    let sentTotal = 0
    let failedTotal = 0

    for (const user of target.users) {
      const result = await sendAndPersistNotification({
        userId: user.id,
        sentByUserId: context.userId || null,
        title,
        message,
        type: notificationType,
        transactionId: context.transaction?.id || null,
        processInstanceId: context.processInstance?.id || null,
        data: pushData
      })

      sentTotal += result.sent || 0
      failedTotal += result.failed || 0

      deliveryResults.push({
        userId: user.id,
        userName: user.userName,
        notificationId: result.notificationId || null,
        sent: result.sent || 0,
        failed: result.failed || 0,
        skipped: Boolean(result.skipped),
        reason: result.reason || null,
        status: result.status || (result.skipped ? 'skipped' : 'sent')
      })
    }

    let status = 'failed'

    if (sentTotal > 0 && failedTotal > 0) {
      status = 'partial'
    } else if (sentTotal > 0) {
      status = 'sent'
    } else if (deliveryResults.every(item => item.skipped)) {
      status = 'skipped'
    }

    return {
      type: 'notification',
      channel: 'firebase',
      status,
      targetType: target.targetType,
      organization_department_roles_id: target.organization_department_roles_id,
      camunda_group_key: target.camunda_group_key,
      title,
      message,
      notificationType,
      transactionId: context.transaction?.id || null,
      stageCode: context.stage?.code || null,
      sent: sentTotal,
      failed: failedTotal,
      recipients: deliveryResults
    }
  }
}

module.exports = SendNotificationStrategy
