'use strict'

/**
 * Remove legacy default type "وثائق المواطن".
 * File uploads use type_doc_id from file_picker / request — not this seed.
 * Keeps "وثيقة موقّعة رقمياً" for digital signature records.
 */

module.exports = {
  async up (queryInterface) {
    const [[citizenType]] = await queryInterface.sequelize.query(`
      SELECT id FROM type_docs WHERE name = 'وثائق المواطن' LIMIT 1
    `)

    if (!citizenType?.id) {
      return
    }

    const citizenId = citizenType.id

    const [[signedType]] = await queryInterface.sequelize.query(`
      SELECT id FROM type_docs WHERE name = 'وثيقة موقّعة رقمياً' LIMIT 1
    `)

    const signedId = signedType?.id || null

    if (signedId) {
      await queryInterface.sequelize.query(`
        UPDATE document_signature
        SET type_doc_id = :signedId, updated_at = NOW()
        WHERE type_doc_id = :citizenId
      `, {
        replacements: { signedId, citizenId }
      })
    }

    const [[fallbackType]] = await queryInterface.sequelize.query(`
      SELECT id FROM type_docs
      WHERE id != :citizenId
      ORDER BY id ASC
      LIMIT 1
    `, {
      replacements: { citizenId }
    })

    const fallbackId = fallbackType?.id || signedId

    if (fallbackId) {
      await queryInterface.sequelize.query(`
        UPDATE document_templates
        SET type_doc_id = :fallbackId, updated_at = NOW()
        WHERE type_doc_id = :citizenId
      `, {
        replacements: { fallbackId, citizenId }
      })
    }

    await queryInterface.sequelize.query(`
      DELETE FROM type_docs WHERE id = :citizenId
    `, {
      replacements: { citizenId }
    })
  },

  async down (queryInterface) {
    await queryInterface.bulkInsert('type_docs', [
      {
        name: 'وثائق المواطن',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  }
}
