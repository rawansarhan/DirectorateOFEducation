'use strict'

/**
 * يملأ display_name (الاسم العربي المعروض) لكل صلاحية موجودة.
 *
 * المفتاح هو name (الكود التقني) والقيمة هي الاسم المعروض في الواجهة.
 * الترجمات مبدئية — عدّل النصوص هنا ثم أعد تشغيل السيدر لتطبيقها.
 *
 * أي صلاحية غير مذكورة هنا تبقى display_name = NULL، والواجهة تعرض
 * name بدلاً منها، فلا شيء ينكسر.
 */
const DISPLAY_NAMES = {
  // ===== الموظفون =====
  admin_register_employee: 'تسجيل موظف جديد',
  EMPLOYEE_VIEW: 'عرض الموظفين',
  EMPLOYEE_UPDATE: 'تعديل بيانات الموظفين',

  // ===== أنواع العمليات =====
  TYPETPROCESS_CREATE: 'إنشاء نوع عملية',
  TYPETPROCESS_UPDATE: 'تعديل نوع عملية',
  TYPETPROCESS_VIEW: 'عرض أنواع العمليات',
  TYPETPROCESS_VIEW_ONLY_ACTIVE: 'عرض أنواع العمليات المفعّلة',
  TYPETPROCESS_VIEW_ALL: 'عرض جميع أنواع العمليات',

  // ===== العمليات =====
  PROCESS_CREATE: 'إنشاء عملية',
  PROCESS_SETUP: 'إعداد عملية',
  PROCESS_READ_AUTH: 'عرض العمليات المصرّح بها',
  PROCESS_START: 'بدء عملية',
  PROCESS_REVIEW: 'مراجعة العمليات',
  PROCESS_DETAILS: 'عرض تفاصيل العملية',
  PROCESS_VIEW: 'عرض العمليات',
  PROCESS_APPROVE: 'اعتماد العمليات',
  PROCESS_VIEW_COMPLAINT: 'عرض الشكاوى',
  PROCESS_VIEW_STATS: 'عرض إحصائيات العمليات',
  PROCESS_VIEW_NOTACTIVE_NOTAPPROVED: 'عرض العمليات غير المفعّلة وغير المعتمدة',
  PROCESS_VIEW_MISSING_STAGE_CONFIGE: 'عرض العمليات الناقصة إعدادات المراحل',

  // ===== إعدادات المراحل =====
  STAGE_CONFIG_CREATE: 'إنشاء إعدادات مرحلة',
  STAGE_CONFIG_READ: 'عرض إعدادات المراحل',

  // ===== المهام =====
  tasks_STATS_ACTIVE: 'إحصائيات المهام النشطة',
  tasks_STATS_REJECTED_LAST_MONTH: 'إحصائيات المهام المرفوضة (آخر شهر)',
  tasks_STATS_COMPLETED_LAST_MONTH: 'إحصائيات المهام المنجزة (آخر شهر)',

  // ===== المتطلبات =====
  REQUIREMENTS_READ_ALL: 'عرض جميع المتطلبات',
  REQUIREMENTS_READ_ONE: 'عرض متطلب واحد',
  REQUIREMENTS_CREATE: 'إنشاء متطلب',

  // ===== أنواع المستندات =====
  TYPE_DOC_CREATE: 'إنشاء نوع مستند',
  TYPE_DOC_UPDATE: 'تعديل نوع مستند',
  TYPE_DOC_READ_ALL: 'عرض جميع أنواع المستندات',
  TYPE_DOC_READ_ONE: 'عرض نوع مستند واحد',

  // ===== الحقول =====
  FIELD_CREATE: 'إنشاء حقل',
  FIELD_UPDATE: 'تعديل حقل',
  FIELD_READ: 'عرض الحقول',
  GET_ONE_FIELD: 'عرض حقل واحد',

  // ===== الملفات =====
  FILE_CREATE: 'إنشاء ملف',
  FILE_UPDATE: 'تعديل ملف',
  FILE_READ: 'عرض الملفات',
  GET_ONE_FILE: 'عرض ملف واحد',

  // ===== القوالب =====
  CREATE_TEMPLATE: 'إنشاء قالب',
  UPDATE_TEMPLATE: 'تعديل قالب',
  GET_ALL_TEMPLATE: 'عرض جميع القوالب',
  GET_ONE_TEMPLATE: 'عرض قالب واحد',
  TEMPLATE_READ_ONE: 'قراءة قالب',
  TEMPLATE_EXTRACT_FIELDS: 'استخراج حقول القالب',

  // ===== المؤسسات =====
  ORGANIZATION_CREATE: 'إنشاء مؤسسة',
  ORGANIZATION_UPDATE: 'تعديل مؤسسة',
  ORGANIZATION_DELETE: 'حذف مؤسسة',
  ORGANIZATION_VIEW: 'عرض المؤسسات',

  // ===== الأقسام =====
  DEPARTMENT_CREATE: 'إنشاء قسم',
  DEPARTMENT_UPDATE: 'تعديل قسم',
  DEPARTMENT_DELETE: 'حذف قسم',
  DEPARTMENT_VIEW: 'عرض الأقسام',
  DEPARTMENT_TOGGLE_STATUS: 'تفعيل / تعطيل قسم',

  // ===== الأدوار =====
  ROLE_CREATE: 'إنشاء دور',
  ROLE_UPDATE: 'تعديل دور',
  ROLE_DELETE: 'حذف دور',
  ROLE_VIEW: 'عرض الأدوار',
  ROLE_TOGGLE_STATUS: 'تفعيل / تعطيل دور',

  // ===== الصلاحيات =====
  PERMISSION_READ: 'عرض الصلاحيات',
  ROLE_PERMISSION_READ: 'عرض صلاحيات الأدوار',
  ROLE_PERMISSION_CREATE: 'ربط صلاحيات بدور',
  ROLE_PERMISSION_UPDATE: 'تعديل صلاحيات دور',

  // ===== المواقع =====
  LOCATION_VIEW: 'عرض المواقع',
  LOCATION_CREATE: 'إنشاء موقع',

  // ===== التطبيق =====
  APP_VERSION_MANAGE: 'إدارة إصدارات التطبيق'
}

module.exports = {
  up: async (queryInterface) => {
    for (const [name, displayName] of Object.entries(DISPLAY_NAMES)) {
      await queryInterface.bulkUpdate(
        'permissions',
        { display_name: displayName, updated_at: new Date() },
        { name }
      )
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      'permissions',
      { display_name: null },
      { name: Object.keys(DISPLAY_NAMES) }
    )
  }
}
