const axios = require('axios');
const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = require('./config');

async function sendTelegram(results) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  
    const text = results.map(w =>
      w.error
        ? `${w.area}: 오류 - ${w.error}`
        : `${w.area}: ${w.temperature}, ${w.condition}, ${w.rainChance}`
    ).join('\n');
  
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    });
    console.log('Telegram 메시지 전송 완료');
  }

  module.exports = { sendTelegram };