const axios = require('axios');
const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = require('./config');

async function sendTelegram(results) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

    const text = results.map(w => {
        if (w.error) {
            return `${w.name}: 오류 - ${w.error}`;
        } else {
            // 주요 정보 요약 문자열 생성
            return `${w.name} (${w.companyCode || 'N/A'})\n` +
                   `현재가: ${w.현재가}\n` +
                   `전일대비: ${w.전일대비_상태} ${w.전일대비_가격} (${w.전일대비_퍼센트})\n` +
                   `시가: ${w.시가}, 고가: ${w.고가 || 'N/A'}, 저가: ${w.저가 || 'N/A'}\n` +
                   `거래량: ${w.거래량}, 거래대금: ${w.거래대금}\n` +
                   `조회시각: ${w.time}\n------------------`;
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
