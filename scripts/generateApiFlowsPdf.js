'use strict'

const fs = require('fs')
const path = require('path')

async function main () {
  const puppeteer = require('puppeteer')

  const htmlPath = path.join(__dirname, '..', 'docs', 'API-FLOWS.html')
  const pdfPath = path.join(__dirname, '..', 'docs', 'API-FLOWS.pdf')
  const html = fs.readFileSync(htmlPath, 'utf8')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    })
    console.log('PDF created:', pdfPath)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
