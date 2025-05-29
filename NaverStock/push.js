const axios = require('axios');
const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = require('./config');

function escapeMarkdownV2(text) {
    if (!text) return '';
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

async function sendTelegram(results) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

    const text = results.map(w => {
        if (w.error) {
            return `*${escapeMarkdownV2(w.name)}*: 오류 - ${escapeMarkdownV2(w.error)}`;
        } else {
            // 전일대비 상태에 따라 이모지 추가 (예: 상승: 🔺, 하락: 🔽, 보합: ➖)
            let statusEmoji = '➖';
            if (w.전일대비_상태 === '상승') statusEmoji = '🔺';
            else if (w.전일대비_상태 === '하락') statusEmoji = '🔽';

            return `*${escapeMarkdownV2(w.name)}* (${escapeMarkdownV2(w.companyCode || 'N/A')})\n` +
                   `현재가: \`${escapeMarkdownV2(String(w.현재가))}\`\n` +
                   `전일대비: ${statusEmoji} ${escapeMarkdownV2(w.전일대비_상태)} ${escapeMarkdownV2(String(w.전일대비_가격))} (${escapeMarkdownV2(String(w.전일대비_퍼센트))})\n` +
                   `시가: \`${escapeMarkdownV2(String(w.시가))}\`, 고가: \`${escapeMarkdownV2(String(w.고가 || 'N/A'))}\`, 저가: \`${escapeMarkdownV2(String(w.저가 || 'N/A'))}\`\n` +
                   `거래량: \`${escapeMarkdownV2(String(w.거래량))}\`, 거래대금: \`${escapeMarkdownV2(String(w.거래대금))}\`\n` +
                   `조회시각: \`${escapeMarkdownV2(w.time)}\`\n------------------`;
        }
    }).join('\n');

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown' // 필요시 마크다운 포맷 적용 가능
    });

    console.log('Telegram 메시지 전송 완료');
}

module.exports = { sendTelegram };
