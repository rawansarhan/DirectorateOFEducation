'use strict'

const nodemailer = require('nodemailer')

let transporter

function getTransporter () {
  if (transporter) {
    return transporter
  }

  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    throw new Error('EMAIL_USER or EMAIL_PASS is not configured in .env')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  })

  return transporter
}

async function sendEmail ({ to, subject, text }) {
  const mailer = getTransporter()

  return mailer.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  })
}

module.exports = { sendEmail }
