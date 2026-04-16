'use strict';

const { QueryTypes } = require('sequelize')

const ORG_ID = 1

// Parent departments (will be ensured, then renamed if needed)
const PARENTS = [
  'دائرة التنمية الادارية',
  'دائرة التعليم الاساسي',
  'دائرة التعليم الثانوي',
  'دائرة المهني',
  'دائرة التخطيط والاحصاء',
  'دائرة التاهيل والتدريب التربوي',
  'دائرة التعليم الخاص',
  'دائرة المعلوماتية',
  'دائرة شؤون العاملين',
  'دائرة التقنيات',
  'دائرة الأبنية المدرسية'
  ,'دائرة مكتب المدير'
]

// Parent rename mapping (requested names)
const PARENT_RENAMES = new Map([
  ['دائرة المهني', 'دائرة التعليم المهني'],
  ['دائرة التاهيل والتدريب التربوي', 'دائرة التدريب والتاهيل'],
  ['دائرة الأبنية المدرسية', 'دائرة الابنية المدرسية']
])

// Child departments to insert under each parent (requested)
const CHILDREN_BY_PARENT = new Map([
  [
    'دائرة التخطيط والاحصاء',
    ['شعبة الاحصاء', 'شعبة التخطيط']
  ],
  [
    'دائرة التعليم المهني',
    ['شعبة شؤون الطلاب', 'شعبة شؤون العاملين', 'شعبة توجيه']
  ],
  [
    'دائرة التدريب والتاهيل',
    ['شعبة التدريب', 'شعبة التاهيل']
  ],
  [
    'دائرة التعليم الخاص',
    [
      'شعبة العاملين',
      'شعبة الشكاوى',
      'شعبة الاحصائيات',
      'شعبة النقل الاضطراري',
      'شعبة الاقساط',
      'شعبة التراخيص',
      'شعبة شؤون الطلاب'
    ]
  ],
  [
    'دائرة المعلوماتية',
    ['شعبة الخدمات الحاسوبية', 'شعبة الحاسب التعليمي', 'شعبة الشبكات', 'شعبة الصيانة']
  ],
  [
    'دائرة شؤون العاملين',
    [
      'شعبة المستخدمين',
      'شعبة الجهاز المركزي',
      'شعبة النسخ',
      'شعبة السحب',
      'شعبة الاتمتة',
      'شعبة الاضابير',
      'شعبة الضمان الصحي',
      'شعبة الارشيف الالكتروني',
      'شعبة شؤون العاملين',
      'شعبة البطاقات الذاتية'
    ]
  ],
  ['دائرة التعليم الثانوي', ['شعبة الطلاب', 'شعبة المدرسين']],
  ['دائرة الابنية المدرسية', ['شعبة الكهرباء', 'شعبة المياه', 'شعبة الهاتف']],
  ['دائرة التنمية الادارية', ['شعبة الديوان', 'شعبة الديوان الإدارية']]
])

module.exports = {
  up: async queryInterface => {
    const sequelize = queryInterface.sequelize

    return sequelize.transaction(async t => {
      // 1) Ensure base parent departments exist (idempotent)
      for (const name of PARENTS) {
        await sequelize.query(
          `
          INSERT INTO departments (name, organization_id, parent_id, is_active, created_at, updated_at)
          SELECT :name, :orgId, NULL, true, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM departments
            WHERE organization_id = :orgId
              AND parent_id IS NULL
              AND name = :name
          );
          `,
          { replacements: { name, orgId: ORG_ID }, transaction: t }
        )
      }

      // 2) Rename parent departments to requested names (safe + idempotent)
      for (const [oldName, newName] of PARENT_RENAMES.entries()) {
        // If newName already exists as a parent, we don't rename to avoid duplicates
        const existingNew = await sequelize.query(
          `
          SELECT id FROM departments
          WHERE organization_id = :orgId AND parent_id IS NULL AND name = :newName
          LIMIT 1;
          `,
          {
            replacements: { orgId: ORG_ID, newName },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        if (existingNew?.[0]?.id) continue

        await sequelize.query(
          `
          UPDATE departments
          SET name = :newName, updated_at = NOW()
          WHERE organization_id = :orgId
            AND parent_id IS NULL
            AND name = :oldName;
          `,
          { replacements: { orgId: ORG_ID, oldName, newName }, transaction: t }
        )
      }

      // 3) Insert child departments and attach to correct parent_id
      for (const [parentName, children] of CHILDREN_BY_PARENT.entries()) {
        const parent = await sequelize.query(
          `
          SELECT id FROM departments
          WHERE organization_id = :orgId AND parent_id IS NULL AND name = :parentName
          LIMIT 1;
          `,
          {
            replacements: { orgId: ORG_ID, parentName },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        const parentId = parent?.[0]?.id
        if (!parentId) {
          throw new Error(`Parent department not found: ${parentName}`)
        }

        for (const childName of children) {
          await sequelize.query(
            `
            INSERT INTO departments (name, organization_id, parent_id, is_active, created_at, updated_at)
            SELECT :childName, :orgId, :parentId, true, NOW(), NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM departments
              WHERE organization_id = :orgId
                AND parent_id = :parentId
                AND name = :childName
            );
            `,
            {
              replacements: { childName, orgId: ORG_ID, parentId },
              transaction: t
            }
          )
        }
      }
    })
  },

  down: async queryInterface => {
    const sequelize = queryInterface.sequelize

    const childNames = Array.from(CHILDREN_BY_PARENT.values()).flat()
    const parentNames = Array.from(CHILDREN_BY_PARENT.keys())

    return sequelize.transaction(async t => {
      // Delete children first (only those under expected parents)
      for (const parentName of parentNames) {
        const parent = await sequelize.query(
          `
          SELECT id FROM departments
          WHERE organization_id = :orgId AND parent_id IS NULL AND name = :parentName
          LIMIT 1;
          `,
          {
            replacements: { orgId: ORG_ID, parentName },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        const parentId = parent?.[0]?.id
        if (!parentId) continue

        await sequelize.query(
          `
          DELETE FROM departments
          WHERE organization_id = :orgId
            AND parent_id = :parentId
            AND name IN (:childNames);
          `,
          { replacements: { orgId: ORG_ID, parentId, childNames }, transaction: t }
        )
      }
    })
  }
};
