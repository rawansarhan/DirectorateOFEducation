'use strict'

/**
 * documentInstanceRepository — جدول document_instance
 *
 * يربط معاملة (transaction) بقالب (document_template) وقيم الملء (data_json)
 * ومسار PDF المولّد (generated_pdf_path).
 */

const { DocumentInstance } = require('../../../../entities')

async function create (data, options = {}) {
  return DocumentInstance.create(data, options)
}

async function findById (id) {
  return DocumentInstance.findByPk(id)
}

/** يُستخدم من GENERATE_PDF — instance واحد لكل (transaction + template) */
async function findByTransactionAndTemplate (transactionId, documentTemplateId) {
  return DocumentInstance.findOne({
    where: {
      transaction_id: transactionId,
      document_template_id: documentTemplateId
    },
    order: [['id', 'DESC']]
  })
}

async function findAllByTransactionId (transactionId) {
  return DocumentInstance.findAll({
    where: { transaction_id: transactionId },
    order: [['id', 'ASC']]
  })
}

async function updateInstance (instance, data, options = {}) {
  return instance.update(data, options)
}

module.exports = {
  create,
  findById,
  findByTransactionAndTemplate,
  findAllByTransactionId,
  updateInstance
}
