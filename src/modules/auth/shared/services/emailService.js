'use strict'

const nodemailer = require('nodemailer')
const { EMAIL_USER, EMAIL_PASS } = require('../../../../core/config/env')

let transporter

function getTransporter () {
  if (transporter) {
    return transporter
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not configured in .env')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  })

  return transporter
}

async function sendEmail ({ to, subject, text }) {
  const mailer = getTransporter()

  return mailer.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text
  })
}

module.exports = { sendEmail }
