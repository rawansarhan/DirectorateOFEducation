'use strict'

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize
    const { QueryTypes } = require('sequelize')

    const ORGANIZATION_ID = 1

    const ROLE_CODES = {
      DIRECTOR_OF_EDUCATION: 'DIRECTOR_OF_EDUCATION',
      DIRECTOR_OFFICE_MANAGER: 'DIRECTOR_OFFICE_MANAGER',
      ASSISTANT_DIRECTOR: 'ASSISTANT_DIRECTOR',
      DEPARTMENT_DIRECTOR: 'DEPARTMENT_DIRECTOR',
      DIVISION_MANAGER: 'DIVISION_MANAGER',
      EMPLOYEE: 'EMPLOYEE',
      CITIZEN: 'CITIZEN'
    }

    const TARGET = {
      DIRECTOR_OFFICE_DEPARTMENT_NAME: 'دائرة مكتب المدير',
      EDUCATION_SECONDARY_PARENT_NAME: 'دائرة التعليم الثانوي',
      PLANNING_BRANCH_PARENT_NAME: 'شعبة التخطيط'
    }

    const now = new Date()

    // ================= GET ROLES =================
    const roles = await sequelize.query(
      `
      SELECT id, code
      FROM roles
      WHERE code IN (:roleCodes);
      `,
      {
        replacements: { roleCodes: Object.values(ROLE_CODES) },
        type: QueryTypes.SELECT
      }
    )

    const roleIds = Object.fromEntries(roles.map(r => [r.code, r.id]))

    for (const code of Object.values(ROLE_CODES)) {
      if (!roleIds[code]) throw new Error(`Role not found: ${code}`)
    }

    // ================= GET DEPARTMENTS =================
    const departments = await sequelize.query(
      `
      SELECT id, name, parent_id
      FROM departments
      WHERE organization_id = :orgId
        AND name IN (
          :directorOfficeDeptName,
          :educationSecondaryParentName,
          :planningBranchParentName
        );
      `,
      {
        replacements: {
          orgId: ORGANIZATION_ID,
          directorOfficeDeptName: TARGET.DIRECTOR_OFFICE_DEPARTMENT_NAME,
          educationSecondaryParentName: TARGET.EDUCATION_SECONDARY_PARENT_NAME,
          planningBranchParentName: TARGET.PLANNING_BRANCH_PARENT_NAME
        },
        type: QueryTypes.SELECT
      }
    )

    const directorOfficeDept = departments.find(
      d => d.name === TARGET.DIRECTOR_OFFICE_DEPARTMENT_NAME
    )

    const educationSecondaryParent = departments.find(
      d => d.name === TARGET.EDUCATION_SECONDARY_PARENT_NAME
    )

    const planningBranchParent = departments.find(
      d => d.name === TARGET.PLANNING_BRANCH_PARENT_NAME
    )

    if (!directorOfficeDept) throw new Error('Director office dept not found')
    if (!educationSecondaryParent) throw new Error('Education dept not found')
    if (!planningBranchParent) throw new Error('Planning branch not found')

    // ================= CHILD DEPARTMENTS =================
    const circles = await sequelize.query(
      `
      SELECT id, name
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: {
          orgId: ORGANIZATION_ID,
          parentId: educationSecondaryParent.id
        },
        type: QueryTypes.SELECT
      }
    )

    const circlesToAssign =
      circles.length > 0 ? circles : [educationSecondaryParent]

    const branches = await sequelize.query(
      `
      SELECT id, name
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: {
          orgId: ORGANIZATION_ID,
          parentId: planningBranchParent.id
        },
        type: QueryTypes.SELECT
      }
    )

    const branchesToAssign =
      branches.length > 0 ? branches : [planningBranchParent]

    // ================= BUILD ROW =================
    const buildRow = (roleCode, orgId, deptId = null) => ({
      role_id: roleIds[roleCode],
      organization_id: orgId,
      department_id: deptId,
      parent_id: null,
      camunda_group_key: roleCode, // ✅ مهم
      is_active: true,
      created_at: now,
      updated_at: now
    })

    const desiredRows = []

    // Director of education
    desiredRows.push(buildRow(ROLE_CODES.DIRECTOR_OF_EDUCATION, ORGANIZATION_ID))

    // Director office manager
    desiredRows.push(
      buildRow(
        ROLE_CODES.DIRECTOR_OFFICE_MANAGER,
        ORGANIZATION_ID,
        directorOfficeDept.id
      )
    )

    // Circles roles
    for (const circle of circlesToAssign) {
      desiredRows.push(
        buildRow(ROLE_CODES.ASSISTANT_DIRECTOR, ORGANIZATION_ID, circle.id)
      )
      desiredRows.push(
        buildRow(ROLE_CODES.DEPARTMENT_DIRECTOR, ORGANIZATION_ID, circle.id)
      )
      desiredRows.push(buildRow(ROLE_CODES.EMPLOYEE, ORGANIZATION_ID, circle.id))
    }

    // Branch roles
    for (const branch of branchesToAssign) {
      desiredRows.push(
        buildRow(ROLE_CODES.DIVISION_MANAGER, ORGANIZATION_ID, branch.id)
      )
      desiredRows.push(buildRow(ROLE_CODES.EMPLOYEE, ORGANIZATION_ID, branch.id))
    }

    // Citizen
    desiredRows.push(buildRow(ROLE_CODES.CITIZEN, null, null))

    // ================= EXISTING =================
    const existing = await sequelize.query(
      `
      SELECT id, role_id, organization_id, department_id
      FROM organization_department_roles
      WHERE role_id IN (:roleIds);
      `,
      {
        replacements: { roleIds: Object.values(roleIds) },
        type: QueryTypes.SELECT
      }
    )

    const existingKeys = new Set(
      existing.map(
        r =>
          `${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`
      )
    )

    const rowsToInsert = desiredRows.filter(r => {
      const key = `${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`
      return !existingKeys.has(key)
    })

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert(
        'organization_department_roles',
        rowsToInsert
      )
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize
    const { QueryTypes } = require('sequelize')

    const ORGANIZATION_ID = 1

    const ROLE_CODES = [
      'DIRECTOR_OF_EDUCATION',
      'DIRECTOR_OFFICE_MANAGER',
      'ASSISTANT_DIRECTOR',
      'DEPARTMENT_DIRECTOR',
      'DIVISION_MANAGER',
      'EMPLOYEE',
      'CITIZEN'
    ]

    const roles = await sequelize.query(
      `
      SELECT id, code FROM roles WHERE code IN (:roleCodes);
      `,
      {
        replacements: { roleCodes: ROLE_CODES },
        type: QueryTypes.SELECT
      }
    )

    const roleIds = Object.fromEntries(roles.map(r => [r.code, r.id]))

    await queryInterface.bulkDelete(
      'organization_department_roles',
      {
        role_id: Object.values(roleIds)
      },
      {}
    )
  }
}