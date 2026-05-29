'use strict'

const axios = require('axios')

// تحويل الرقم السوري من 09XXXXXXXX إلى +963XXXXXXXX
function toInternational(phone) {
  const cleaned = phone.replace(/\s+/g, '')
  if (cleaned.startsWith('+963')) return cleaned
  if (cleaned.startsWith('09')) return '+963' + cleaned.slice(1)
  if (cleaned.startsWith('9')) return '+963' + cleaned
  return cleaned
}

async function sendSms(phone, message) {
  const url = process.env.TRACCAR_URL
  const token = process.env.TRACCAR_TOKEN

  if (!url || !token) {
    throw new Error('TRACCAR_URL or TRACCAR_TOKEN not configured in .env')
  }

  const internationalPhone = toInternational(phone)

  try {
  const response = await axios.post(
    url,
    { to: internationalPhone, message :message},
    {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 10000
    }
  );
  console.log("phone:", internationalPhone);
  console.log("message:", message);

  console.log("Success:", response.data);


} catch (error) {
  console.log("Error:", error.response?.data || error.message);
}
}

module.exports = { sendSms }
