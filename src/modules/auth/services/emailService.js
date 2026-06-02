'use strict'

const nodemailer = require('nodemailer')
const { EMAIL_USER, EMAIL_PASS } = require('../../../core/config/env')

let transporter

function getTransporter () {
  if (transporter) {
    return transporter
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
