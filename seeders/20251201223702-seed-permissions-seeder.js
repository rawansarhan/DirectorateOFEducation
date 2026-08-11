'use strict'

/**
 * name = عربي معروض
 * code = كود authorize()
 * type = فئة الصلاحية
 */
const PERMISSIONS = [
  // admin
  {
    name: 'انشاء و تعديل و عرض الهيكل التنظيمي للنظام',
    code: 'ORGANIZATIONAL_STRUCTURE_CREATE',
    type: 'admin'
  },
  {
    name: 'ادارة اجراءات نشر المعاملة',
    code: 'PROCESS_PUBLISH_MANAGE',
    type: 'admin'
  },
  {
    name: 'الموافقة على نشر معاملة بشكل نهائي',
    code: 'PROCESS_REVIEW',
    type: 'admin'
  },
  {
    name: 'ادارة الاصدارات الخاصة بالتطبيق',
    code: 'APP_VERSION_MANAGE',
    type: 'admin'
  },
  {
    name: 'ادارة الصلاحيات الخاصة بالنظام',
    code: 'PERMISSION_MANAGE',
    type: 'admin'
  },
  {
    name: 'عرض سجلات التدقيق الأمنية والإدارية',
    code: 'VIEW_AUDIT_LOGS',
    type: 'admin'
  },

  // employee
  {
    name: 'عرض احصائيات الموظفين',
    code: 'EMPLOYEES_STATS',
    type: 'employee'
  },
  {
    name: 'عرض تفاصيل المعاملة من قبل الموظف',
    code: 'VIEW_HISTORY_TRANSACTION',
    type: 'employee'
  },
  {
    name: 'عرض و انشاءالمستندات النهائية المنشئة للمعاملة',
    code: 'VIEW_CREATE_FINAL_DOCUMENT',
    type: 'employee'
  },
  {
    name: 'حذف المستند النهائي لطلب معاملة',
    code: 'DELETE_FINAL_DOCUMENT',
    type: 'employee'
  },
  {
    name: 'عرض الهيكل التنظيمي',
    code: 'GET_ORGANIZATIONAL_STRUCTURE',
    type: 'employee'
  },
  {
    name: 'احصائيات المعاملات',
    code: 'PROCESS_VIEW_STATS',
    type: 'employee'
  },
  {
    name: 'عدد الطلبات النشطة التي لم تنجز',
    code: 'TASKS_STATS_ACTIVE',
    type: 'employee'
  },
  {
    name: 'عرض الطلبات المرفوضة اخر شهر',
    code: 'TASKS_STATS_REJECTED_LAST_MONTH',
    type: 'employee'
  },
  {
    name: 'عدد الطلبات المنجزة اخر شهر',
    code: 'tasks_STATS_COMPLETED_LAST_MONTH',
    type: 'employee'
  },
  {
    name: 'عرض الطلبات المرفوضة للمعاملات حسب القسم المدخل',
    code: 'GET_TASK_REJECTED_BY_DEPARTMENT',
    type: 'employee'
  },
  {
    name: 'عرض طلبات المنجزة للمعاملات حسب القسم المدخل',
    code: 'GET_TASK_COMPLETED_BY_DEPARTMENT',
    type: 'employee'
  },
  {
    name: 'عرض كل الطلبات الخاصة بالموظف',
    code: 'GET_ALL_TASK_FOR_EMPLOYEE',
    type: 'employee'
  },
  {
    name: 'اجراءات استلام المعاملة وتوقيعها',
    code: 'TASK_SIGNING',
    type: 'employee'
  },
  {
    name: 'اجراءات التحقق من المستندات المرفقة بالمعاملة من خلال الرمز',
    code: 'DOCUMENT_VERIFY_BY_CODE',
    type: 'employee'
  },

  // employee, citizen, admin
  {
    name: 'اعدادات رمز ال PIN',
    code: 'PIN_SITTING',
    type: 'employee,citizen,admin'
  },

  // citizen
  {
    name: 'اجراءات طلب المعاملة من قبل المواطن',
    code: 'TRANSACTION_SUBMIT',
    type: 'citizen'
  }
]

module.exports = {
  async up (queryInterface) {
    const now = new Date()

    await queryInterface.bulkInsert(
      'permissions',
      PERMISSIONS.map(item => ({
        name: item.name,
        code: item.code,
        type: item.type,
        created_at: now,
        updated_at: now
      })),
      { ignoreDuplicates: true }
    )
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete(
      'permissions',
      {
        code: PERMISSIONS.map(item => item.code)
      },
      {}
    )
  }
}
