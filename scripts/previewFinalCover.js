'use strict'

const fs = require('fs')
const path = require('path')

const {
  buildCoverPdfBytes
} = require('../src/modules/transaction/certificate/services/finalDocumentBuilderService')
const {
  signDocumentBinding,
  isAuthorityKeyConfigured
} = require('../src/modules/transaction/integrityChain/services/authoritySignatureService')
const {
  buildVerificationUrl
} = require('../src/modules/transaction/document/services/qrStampService')

async function main () {
  const transaction = {
    id: 12,
    status: 'completed',
    genesis_hash: 'genesis_demo_hash_123',
    first_name: 'أحمد',
    last_name: 'الحسن',
    father_name: 'محمد',
    mother_name: 'فاطمة',
    national_id: '12345678901'
  }

  let finalQr = null

  if (isAuthorityKeyConfigured()) {
    const signature = signDocumentBinding({
      transactionId: transaction.id,
      genesisHash: transaction.genesis_hash,
      documentInstanceId: 5
    })

    finalQr = {
      verification_url: buildVerificationUrl({
        apiBaseUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
        transactionId: transaction.id,
        genesisHash: transaction.genesis_hash,
        documentInstanceId: 5,
        signatureBase64Url: signature
      })
    }
  }

  const processName = 'منح إجازة دراسية'

  const bytes = await buildCoverPdfBytes({ transaction, processName, finalQr })
  const outPath = path.join(process.cwd(), 'preview-final-cover.pdf')
  fs.writeFileSync(outPath, bytes)

  console.log('تم إنشاء المعاينة:', outPath)
  console.log('QR متضمَّن:', Boolean(finalQr))
}

main().catch(err => {
  console.error('فشل توليد المعاينة:', err)
  process.exit(1)
})
