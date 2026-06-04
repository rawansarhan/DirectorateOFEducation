const {

  User,

  UserRoleAssignment,

  UserDeviceToken,

  OrgDeptRole

} = require('../../../../entities')

const { sendPushNotification } = require('../../../auth/services/pushNotificationService')



function isAuthNotificationTarget (payload, orgDeptRole) {

  const targetKey = payload.to_organization_department_roles_camunda_group_key



  if (targetKey === 'AUTH') {

    return true

  }



  const roleKey = orgDeptRole?.camunda_group_key



  return roleKey === 'AUTH'

}



async function resolveNotificationRecipients (payload, context) {

  const roleId = payload.to_organization_department_roles_id

  let orgDeptRole = null



  if (roleId) {

    orgDeptRole = await OrgDeptRole.findByPk(roleId, {

      attributes: ['id', 'camunda_group_key']

    })

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

      'to_organization_department_roles_id or to_organization_department_roles_camunda_group_key is required'

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



async function loadActiveDeviceTokens (userIds) {

  if (!userIds.length) {

    return []

  }



  return UserDeviceToken.findAll({

    where: {

      user_id: userIds,

      is_active: true

    },

    attributes: ['id', 'user_id', 'fcm_token']

  })

}



class SendNotificationStrategy {

  async execute ({ payload, context }) {

    const message = payload.message

    const title = payload.subject || payload.title || 'إشعار من نظام المعاملات'



    if (!message) {

      throw new Error('message is required')

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

        sent: 0

      }

    }



    const userIds = target.users.map(user => user.id)

    const deviceTokens = await loadActiveDeviceTokens(userIds)



    if (!deviceTokens.length) {

      return {

        type: 'notification',

        channel: 'firebase',

        status: 'skipped',

        reason: 'No active FCM tokens found',

        targetType: target.targetType,

        organization_department_roles_id: target.organization_department_roles_id,

        camunda_group_key: target.camunda_group_key,

        sent: 0

      }

    }



    const pushResult = await sendPushNotification({

      tokens: deviceTokens.map(item => item.fcm_token),

      title,

      body: message,

      data: {

        transactionId: context.transaction?.id || '',

        stageCode: context.stage?.code || '',

        targetType: target.targetType,

        camundaGroupKey: target.camunda_group_key || ''

      }

    })



    if (pushResult.invalidTokens?.length) {

      await UserDeviceToken.update(

        { is_active: false },

        {

          where: {

            fcm_token: pushResult.invalidTokens

          }

        }

      )

    }



    const recipients = target.users.map(user => {

      const userTokens = deviceTokens.filter(item => item.user_id === user.id)



      return {

        userId: user.id,

        userName: user.userName,

        tokens: userTokens.length,

        status: userTokens.length ? 'sent' : 'skipped'

      }

    })



    return {

      type: 'notification',

      channel: 'firebase',

      status: pushResult.sent > 0 ? 'sent' : 'failed',

      targetType: target.targetType,

      organization_department_roles_id: target.organization_department_roles_id,

      camunda_group_key: target.camunda_group_key,

      title,

      message,

      transactionId: context.transaction?.id || null,

      stageCode: context.stage?.code || null,

      sent: pushResult.sent,

      failed: pushResult.failed,

      recipients,

      pushResults: pushResult.results

    }

  }

}



module.exports = SendNotificationStrategy

