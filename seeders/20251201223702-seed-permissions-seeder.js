module.exports = {
up: async (queryInterface) => {
const perms = [
  //admin
'ADMIN_REGISTER_EMPLOYEE',
'CREATE',
'UPDATE',
'VIEW_ONLY_ACTIVE',
'UPDATE',
'VIEW_ALL',
'VIEW_ONE',
'DEPARTMENT_OVERVIEW',
'TEMPLATE_EXTRACT_FIELDS',
'PROCESS_REVIEW',
//employee
'DEPARTMENT_LEAVES', //عرض الاقسام التابعة للمؤسسة
'EMPLOYEES_STATS',//عرض احصائيات الموظفين 
'ROLE_VIEW_BY_DEPARTMENT',
'TEMPLETE_VIEW_ONE',
'VIEW_HISTORY_TRANSACTION',
'VIEW_CREATE_FINAL_DOCUMENT',//
'GET_ORGANIZATIONAL_STRUCTURE',//عرض الهيكل التنظيمي 
'PROCESS_VIEW_STATS',//احصائيات المعاملات 
'TASKS_STATS_ACTIVE',//عدد الطلبات النشطة التي لم تنجز
'TASKS_STATS_REJECTED_LAST_MONTH',//عرض الطلبات المرفوضة اخر شهر
'tasks_STATS_COMPLETED_LAST_MONTH',//عدد الطلبات المنجزة اخر شهر
'GET_TASK_REJECTED_BY_DEPARTMENT',//عرض الطلبات المرفوضة للمعاملات حسب القسم المدخل
'GET_TASK_COMPLETED_BY_DEPARTMENT',//عرض طلبات المنجزة للمعاملات حسب القسم المدخل
'GET_ALL_TASK_FOR_EMPLOYEE', //عرض كل الطلبات الخاصة بالموظف
'TASK_SIGNING',//اجراءات استلام المعاملة وتوقيعها

//employee , citizen , admin
'GET_PROCESS_BY_TYPE',//عرض المعاملات حسب النوع 
'PIN_SITTING'
//cititzen

];


await queryInterface.bulkInsert(
  'permissions',
  perms.map(p => ({ name: p, created_at: new Date(), updated_at: new Date() })),
  { ignoreDuplicates: true }
);
},
down: async (queryInterface) => {
await queryInterface.bulkDelete('permissions', null, {});
}
};