
module.exports = {
    AREA_CODES: {
        '서울': '09140104',
        '부산': '09140111',
    },
    TELEGRAM_TOKEN: '',    // 텔레그램 봇 토큰
    TELEGRAM_CHAT_ID: '',  // 텔레그램 Chat ID
}

//텔레그램 Chat ID 구하기
//const url1 = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`;

//텔레그램 Chat ID 로 메시지 전달 
//const url2 = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;