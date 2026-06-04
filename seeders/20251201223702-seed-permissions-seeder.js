module.exports = {
up: async (queryInterface) => {
const perms = [
'admin_register_employee',
'TYPETPROCESS_CREATE',
'TYPETPROCESS_UPDATE',
'TYPETPROCESS_VIEW',
'FIELD_READ',
'FIELD_CREATE',
'FIELD_UPDATE',
'FILE_READ',
'FILE_CREATE',
'FILE_UPDATE',
'PROCESS_CREATE',
'PROCESS_SETUP',
'PROCESS_READ_AUTH',
'PROCESS_START',
'STAGE_CONFIG_CREATE',
'STAGE_CONFIG_READ',
'GET_ONE_FIELD',
'GET_ONE_FILE',
'CREATE_TEMPLATE',
'UPDATE_TEMPLATE',
'GET_ALL_TEMPLATE',
'GET_ONE_TEMPLATE',
'ORGANIZATION_CREATE',
'ORGANIZATION_UPDATE',
'ORGANIZATION_DELETE',
'ORGANIZATION_VIEW',
'DEPARTMENT_CREATE',
'DEPARTMENT_UPDATE',
'DEPARTMENT_DELETE',
'DEPARTMENT_VIEW',
'DEPARTMENT_TOGGLE_STATUS',
'ROLE_CREATE',
'ROLE_UPDATE',
'ROLE_DELETE',
'ROLE_VIEW',
'ROLE_TOGGLE_STATUS',
'PROCESS_APPROVE',
'PROCESS_VIEW',
'PROCESS_VIEW_COMPLAINT',
'LOCATION_VIEW'
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