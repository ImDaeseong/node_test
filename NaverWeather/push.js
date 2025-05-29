const axios = require('axios');
const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = require('./config');

function escapeMarkdownV2(text) {
  if (!text) return '';
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

async function sendTelegram(results) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = results.map(w =>
    w.error
      ? `*${escapeMarkdownV2(w.area)}*: 오류 - ${escapeMarkdownV2(w.error)}`
      : `*${escapeMarkdownV2(w.area)}*: ${escapeMarkdownV2(w.temperature)}, ${escapeMarkdownV2(w.condition)}, ${escapeMarkdownV2(w.rainChance)}`
  ).join('\n');

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'MarkdownV2'  // 마크다운 포맷 적용
  });
  console.log('Telegram 메시지 전송 완료');
}

module.exports = { sendTelegram };
