'use strict';

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

    // Find role ids by code
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

    // Find department ids by name
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

    const directorOfficeDept = departments.find(d => d.name === TARGET.DIRECTOR_OFFICE_DEPARTMENT_NAME)
    const educationSecondaryParent = departments.find(d => d.name === TARGET.EDUCATION_SECONDARY_PARENT_NAME)
    const planningBranchParent = departments.find(d => d.name === TARGET.PLANNING_BRANCH_PARENT_NAME)

    if (!directorOfficeDept) throw new Error(`Department not found: ${TARGET.DIRECTOR_OFFICE_DEPARTMENT_NAME}`)
    if (!educationSecondaryParent) throw new Error(`Department not found: ${TARGET.EDUCATION_SECONDARY_PARENT_NAME}`)
    if (!planningBranchParent) throw new Error(`Department not found: ${TARGET.PLANNING_BRANCH_PARENT_NAME}`)

    // Get "circle" departments under: دائرة التعليم الثانوي
    const circles = await sequelize.query(
      `
      SELECT id, name
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: { orgId: ORGANIZATION_ID, parentId: educationSecondaryParent.id },
        type: QueryTypes.SELECT
      }
    )

    // If there are no children circles, fallback to using the parent itself.
    const circlesToAssign = circles.length > 0 ? circles : [educationSecondaryParent]

    // Get "branch" departments under: شعبة التخطيط
    const branches = await sequelize.query(
      `
      SELECT id, name
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: { orgId: ORGANIZATION_ID, parentId: planningBranchParent.id },
        type: QueryTypes.SELECT
      }
    )

    // If there are no child branches, fallback to using the parent itself.
    const branchesToAssign = branches.length > 0 ? branches : [planningBranchParent]

    const desiredRows = []



    // (role: مدير التربية، organization_id=1,department_id=null)
    desiredRows.push({
      role_id: roleIds[ROLE_CODES.DIRECTOR_OF_EDUCATION],
      organization_id: ORGANIZATION_ID,
      department_id: null,
      parent_id: null,
      is_active: true,
      created_at: now,
      updated_at: now
    })

    // (role: مدير مكتب المدير، organization_id =1,department_id = دائرة مكتب المدير)
    desiredRows.push({
      role_id: roleIds[ROLE_CODES.DIRECTOR_OFFICE_MANAGER],
      organization_id: ORGANIZATION_ID,
      department_id: directorOfficeDept.id,
      parent_id: null,
      is_active: true,
      created_at: now,
      updated_at: now
    })

    // (role: معاون المدير ... لكل دائرة)
    for (const circle of circlesToAssign) {
      desiredRows.push({
        role_id: roleIds[ROLE_CODES.ASSISTANT_DIRECTOR],
        organization_id: ORGANIZATION_ID,
        department_id: circle.id,
        parent_id: null,
        is_active: true,
        created_at: now,
        updated_at: now
      })
    }

    // (role: مدير دائرة ... لكل دائرة)
    for (const circle of circlesToAssign) {
      desiredRows.push({
        role_id: roleIds[ROLE_CODES.DEPARTMENT_DIRECTOR],
        organization_id: ORGANIZATION_ID,
        department_id: circle.id,
        parent_id: null,
        is_active: true,
        created_at: now,
        updated_at: now
      })
    }

    // (role: موظف ... لكل دائرة)
    for (const circle of circlesToAssign) {
      desiredRows.push({
        role_id: roleIds[ROLE_CODES.EMPLOYEE],
        organization_id: ORGANIZATION_ID,
        department_id: circle.id,
        parent_id: null,
        is_active: true,
        created_at: now,
        updated_at: now
      })
    }

    // (role: مدير شعبة ... لكل شعبة)
    for (const branch of branchesToAssign) {
      desiredRows.push({
        role_id: roleIds[ROLE_CODES.DIVISION_MANAGER],
        organization_id: ORGANIZATION_ID,
        department_id: branch.id,
        parent_id: null,
        is_active: true,
        created_at: now,
        updated_at: now
      })
    }

    // (role: موظف ... لكل شعبة)
    for (const branch of branchesToAssign) {
      desiredRows.push({
        role_id: roleIds[ROLE_CODES.EMPLOYEE],
        organization_id: ORGANIZATION_ID,
        department_id: branch.id,
        parent_id: null,
        is_active: true,
        created_at: now,
        updated_at: now
      })
    }

    // (role: مواطن، organization_id :null, department_id :null)
    desiredRows.push({
      role_id: roleIds[ROLE_CODES.CITIZEN],
      organization_id: null,
      department_id: null,
      parent_id: null,
      is_active: true,
      created_at: now,
      updated_at: now
    })

    // Idempotent: insert only missing rows (unique(role_id, organization_id, department_id))
    const desiredKeys = new Set(
      desiredRows.map(r => `${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`)
    )

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
      existing.map(r => `${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`)
    )

    const rowsToInsert = desiredRows.filter(r => {
      const key = `${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`
      return !existingKeys.has(key) && desiredKeys.has(key)
    })

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert('organization_department_roles', rowsToInsert)
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize
    const { QueryTypes } = require('sequelize')

    const ORGANIZATION_ID = 1

    const ROLE_CODES = [
      'TECHNICAL_OFFICER',
      'DIRECTOR_OF_EDUCATION',
      'DIRECTOR_OFFICE_MANAGER',
      'ASSISTANT_DIRECTOR',
      'DEPARTMENT_DIRECTOR',
      'DIVISION_MANAGER',
      'EMPLOYEE',
      'CITIZEN'
    ]

    const TARGET = {
      DIRECTOR_OFFICE_DEPARTMENT_NAME: 'دائرة مكتب المدير',
      EDUCATION_SECONDARY_PARENT_NAME: 'دائرة التعليم الثانوي',
      PLANNING_BRANCH_PARENT_NAME: 'شعبة التخطيط'
    }

    const roles = await sequelize.query(
      `
      SELECT id, code
      FROM roles
      WHERE code IN (:roleCodes);
      `,
      { replacements: { roleCodes: ROLE_CODES }, type: QueryTypes.SELECT }
    )

    const roleIds = Object.fromEntries(roles.map(r => [r.code, r.id]))
    for (const code of ROLE_CODES) {
      if (!roleIds[code]) throw new Error(`Role not found: ${code}`)
    }

    const departments = await sequelize.query(
      `
      SELECT id, name, parent_id
      FROM departments
      WHERE organization_id = :orgId
        AND name IN (:directorOfficeDeptName, :educationSecondaryParentName, :planningBranchParentName);
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

    const directorOfficeDept = departments.find(d => d.name === TARGET.DIRECTOR_OFFICE_DEPARTMENT_NAME)
    const educationSecondaryParent = departments.find(d => d.name === TARGET.EDUCATION_SECONDARY_PARENT_NAME)
    const planningBranchParent = departments.find(d => d.name === TARGET.PLANNING_BRANCH_PARENT_NAME)

    if (!directorOfficeDept || !educationSecondaryParent || !planningBranchParent) {
      // If context missing, nothing to rollback precisely.
      return
    }

    const circles = await sequelize.query(
      `
      SELECT id
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: { orgId: ORGANIZATION_ID, parentId: educationSecondaryParent.id },
        type: QueryTypes.SELECT
      }
    )
    const circlesToAssign = circles.length > 0 ? circles : [educationSecondaryParent]

    const branches = await sequelize.query(
      `
      SELECT id
      FROM departments
      WHERE organization_id = :orgId
        AND parent_id = :parentId;
      `,
      {
        replacements: { orgId: ORGANIZATION_ID, parentId: planningBranchParent.id },
        type: QueryTypes.SELECT
      }
    )
    const branchesToAssign = branches.length > 0 ? branches : [planningBranchParent]

    const desiredKeys = new Set()
    const addKey = (roleCode, orgId, deptId) => {
      const key = `${roleIds[roleCode]}:${orgId ?? 'null'}:${deptId ?? 'null'}`
      desiredKeys.add(key)
    }

    addKey('TECHNICAL_OFFICER', ORGANIZATION_ID, null)
    addKey('DIRECTOR_OF_EDUCATION', ORGANIZATION_ID, null)
    addKey('DIRECTOR_OFFICE_MANAGER', ORGANIZATION_ID, directorOfficeDept.id)

    for (const circle of circlesToAssign) {
      addKey('ASSISTANT_DIRECTOR', ORGANIZATION_ID, circle.id)
      addKey('DEPARTMENT_DIRECTOR', ORGANIZATION_ID, circle.id)
      addKey('EMPLOYEE', ORGANIZATION_ID, circle.id)
    }

    for (const branch of branchesToAssign) {
      addKey('DIVISION_MANAGER', ORGANIZATION_ID, branch.id)
      addKey('EMPLOYEE', ORGANIZATION_ID, branch.id)
    }

    addKey('CITIZEN', null, null)

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

    const idsToDelete = existing
      .filter(r => desiredKeys.has(`${r.role_id}:${r.organization_id ?? 'null'}:${r.department_id ?? 'null'}`))
      .map(r => r.id)

    if (idsToDelete.length > 0) {
      await queryInterface.bulkDelete(
        'organization_department_roles',
        { id: idsToDelete },
        {}
      )
    }
  }
};
