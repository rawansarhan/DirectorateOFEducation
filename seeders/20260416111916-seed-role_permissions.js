'use strict'

const { QueryTypes } = require('sequelize')

module.exports = {
  async up(queryInterface) {

    const sequelize = queryInterface.sequelize

    // =========================================
    // GET organization_department_roles
    // =========================================
    const orgDeptRoles = await sequelize.query(
      `SELECT id, camunda_group_key FROM organization_department_roles`,
      { type: QueryTypes.SELECT }
    )

    const roleMap = Object.fromEntries(
      orgDeptRoles.map(r => [r.camunda_group_key, r.id])
    )

    // =========================================
    // GET PERMISSIONS
    // =========================================
    const permissions = await sequelize.query(
      `SELECT id, name FROM permissions`,
      { type: QueryTypes.SELECT }
    )

    const permMap = Object.fromEntries(
      permissions.map(p => [p.name, p.id])
    )

    // =========================================
    // OPTIONAL SAFETY CHECKS 🔥
    // =========================================
    if (!roleMap.TECHNICAL_OFFICER)
      throw new Error('TECHNICAL_OFFICER not found')

    if (!roleMap.CITIZEN)
      throw new Error('CITIZEN not found')

    if (!roleMap.EMPLOYEE)
      throw new Error('EMPLOYEE not found')

    if (!roleMap.DIRECTOR_OF_EDUCATION)
      throw new Error('DIRECTOR_OF_EDUCATION not found')

    // =========================================
    // DATA
    // =========================================
    const data = [

      // ================= TECHNICAL OFFICER =================
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.admin_register_employee
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_VIEW
      },
          {
        organization_department_roles_id: roleMap.CITIZEN,
        permission_id: permMap.TYPETPROCESS_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FIELD_READ
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FIELD_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FIELD_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FILE_READ
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FILE_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.FILE_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.PROCESS_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.PROCESS_SETUP
      },
         {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.PROCESS_APPROVE
      },
         {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.PROCESS_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.STAGE_CONFIG_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.STAGE_CONFIG_READ
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.GET_ONE_FIELD
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.GET_ONE_FILE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.CREATE_TEMPLATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.UPDATE_TEMPLATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.GET_ALL_TEMPLATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.GET_ONE_TEMPLATE
      },
      {
        organization_department_roles_id: roleMap.CITIZEN,
        permission_id: permMap.PROCESS_VIEW_COMPLAINT
      },
      {
        organization_department_roles_id: roleMap.EMPLOYEE,
        permission_id: permMap.PROCESS_VIEW_COMPLAINT
      },
      // ================= CITIZEN =================
      {
        organization_department_roles_id: roleMap.CITIZEN,
        permission_id: permMap.PROCESS_START
      },
      {
        organization_department_roles_id: roleMap.CITIZEN,
        permission_id: permMap.PROCESS_READ_AUTH
      },



      // ================= DIRECTOR =================
      {
        organization_department_roles_id: roleMap.DIRECTOR_OF_EDUCATION,
        permission_id: permMap.PROCESS_READ_AUTH
      },

      // ================= EMPLOYEE =================
      {
        organization_department_roles_id: roleMap.EMPLOYEE,
        permission_id: permMap.PROCESS_START
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ORGANIZATION_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ORGANIZATION_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ORGANIZATION_DELETE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ORGANIZATION_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.DEPARTMENT_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.DEPARTMENT_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.DEPARTMENT_DELETE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.DEPARTMENT_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.DEPARTMENT_TOGGLE_STATUS
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ROLE_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ROLE_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ROLE_DELETE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ROLE_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.ROLE_TOGGLE_STATUS
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.LOCATION_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.EMPLOYEE_VIEW
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.EMPLOYEE_UPDATE
      }
    ]

    // =========================================
    // INSERT (idempotent)
    // =========================================
    await queryInterface.bulkInsert('role_permissions', data, { ignoreDuplicates: true })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {})
  }
}