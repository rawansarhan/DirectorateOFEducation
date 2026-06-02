'use strict'

const transactionRepository = require('../repositories/transactionRepository')
const stageRepository = require('../../workflow/repositories/stageRepository')
const documentTemplateRepository =
  require('../../requirements/repositories/documentTemplateRepository')

const { getIntegrityChain } = require('./integrityChainService')
const {
  extractStageEntries,
  INTERNAL_DATA_KEYS
} = require('./integrityChainUtils')
const { API_PUBLIC_URL } = require('../../../core/config/env')
const {
  enrichStagesData,
  toPublicFileUrl
} = require('../../../core/utils/filePath')

function buildStageQrPayload ({
  transactionId,
  stageCode,
  stageOrder,
  integrityChain,
  link
}) {
  const verifyUrl =
    `${API_PUBLIC_URL}/api/transaction/${transactionId}/integrity-chain/verify`

  return {
    v: 1,
    tx: transactionId,
    stage_code: stageCode,
    stage_order: stageOrder,
    genesis: integrityChain.genesis_hash,
    head: link?.cumulative_hash || integrityChain.head_hash,
    link_order: link?.order || null,
    status: integrityChain.chain_status,
    verify_url: verifyUrl
  }
}

async function resolveStageMetaList (processDefinitionId, transactionData) {
  const processStages = processDefinitionId
    ? await stageRepository.findByProcessId(processDefinitionId)
    : []

  const stageByCode = new Map(processStages.map(stage => [stage.code, stage]))
  const entries = extractStageEntries(transactionData)

  return entries.map((entry, index) => {
    const stage = stageByCode.get(entry.stage_code)

    return {
      code: entry.stage_code,
      name: stage?.name || entry.stage_code,
      order: stage ? processStages.findIndex(item => item.id === stage.id) + 1 : index + 1,
      type: stage?.type || null,
      data: entry.stage_data
    }
  })
}

async function enrichTemplatesInStageData (stageData) {
  if (!Array.isArray(stageData?.templates) || !stageData.templates.length) {
    return stageData
  }

  const templates = []

  for (const templateEntry of stageData.templates) {
    const template = templateEntry.template_id
      ? await documentTemplateRepository.findById(templateEntry.template_id)
      : null

    templates.push({
      ...templateEntry,
      template_name: template?.name || null,
      template_file_path: template?.file_path || null,
      template_file_type: template?.file_type || null,
      template_url: template?.file_path
        ? toPublicFileUrl(template.file_path)
        : null
    })
  }

  return {
    ...stageData,
    templates
  }
}

function enrichStageData (stageData) {
  if (!stageData || typeof stageData !== 'object') {
    return stageData
  }

  return {
    ...stageData,
    files: Array.isArray(stageData.files)
      ? stageData.files.map(file => ({
          ...file,
          url: file.url || toPublicFileUrl(file.path)
        }))
      : stageData.files
  }
}

async function getTransactionFullView (transactionId) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const { ProcessInstance } = require('../../../entities')
  const processInstance = await ProcessInstance.findOne({
    where: { transaction_id: transactionId },
    order: [['id', 'DESC']]
  })

  const integrityChain = await getIntegrityChain(transactionId)

  const stageMetaList = await resolveStageMetaList(
    processInstance?.process_definition_id || null,
    transaction.data || {}
  )

  const enrichedData = enrichStagesData(transaction.data || {})

  const stages = await Promise.all(stageMetaList.map(async stageMeta => {
    const enrichedStageData = await enrichTemplatesInStageData(stageMeta.data)
    const stageLink = (integrityChain.links || []).find(
      link => link.stage_code === stageMeta.code
    )

    return {
      stage_code: stageMeta.code,
      stage_name: stageMeta.name,
      stage_order: stageMeta.order,
      stage_type: stageMeta.type,
      data: enrichStageData(enrichedStageData),
      signature_link: stageLink || null,
      qr_payload: buildStageQrPayload({
        transactionId,
        stageCode: stageMeta.code,
        stageOrder: stageMeta.order,
        integrityChain,
        link: stageLink
      })
    }
  }))

  const internalMeta = {}

  for (const key of Object.keys(transaction.data || {})) {
    if (INTERNAL_DATA_KEYS.has(key) || key.startsWith('_')) {
      internalMeta[key] = transaction.data[key]
    }
  }

  const plainTransaction = transaction.get
    ? transaction.get({ plain: true })
    : transaction

  return {
    transaction: {
      id: plainTransaction.id,
      code: plainTransaction.code,
      status: plainTransaction.status,
      version: plainTransaction.version,
      user_id: plainTransaction.user_id,
      genesis_hash: plainTransaction.genesis_hash || null,
      created_at: plainTransaction.created_at,
      updated_at: plainTransaction.updated_at
    },
    process_instance: processInstance
      ? {
          id: processInstance.id,
          status: processInstance.status,
          process_definition_id: processInstance.process_definition_id
        }
      : null,
    data: enrichedData,
    internal_meta: internalMeta,
    stages,
    integrity_chain: integrityChain,
    qr_payload: integrityChain.qr_payload
  }
}

module.exports = {
  getTransactionFullView
}
