'use strict'

/**
 * SYNC_SELF_CARD — يكتب على جداول البطاقة الذاتية من لقطة مرحلة مختومة.
 *
 * targets:
 * - profile_header         → إنشاء بطاقة جديدة (بدون self_card_id)
 * - update_profile_header  → تعديل بطاقة موجودة (يتطلب employee_picker)
 * - history targets        → سجلات تاريخية على بطاقة موجودة
 */

const {
  syncSelfCardFromSealedStage
} = require('../../../organization/selfCard/services/syncSelfCardService')

class SyncSelfCardStrategy {
  async execute ({ payload, context }) {
    const transaction = context?.transaction

    if (!transaction?.id) {
      throw new Error('SYNC_SELF_CARD: transaction غير موجود في السياق')
    }

    const result = await syncSelfCardFromSealedStage({
      payload: payload || {},
      transaction,
      serviceStage: context?.stage || null,
      registeredByUserId: context?.userId || null
    })

    return {
      type: 'self_card',
      ...result
    }
  }
}

module.exports = SyncSelfCardStrategy
