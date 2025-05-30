
module.exports = {
    AREA_CODES: {
        '삼성전자': '005930',
        '포스코퓨처엠': '003670', 
        'LG에너지솔루션' : '373220',
    },
    TELEGRAM_TOKEN: '',    // 텔레그램 봇 토큰
    TELEGRAM_CHAT_ID: '',  // 텔레그램 Chat ID
}

//텔레그램 Chat ID 구하기
//const url1 = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`;

//텔레그램 Chat ID 로 메시지 전달 
//const url2 = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;