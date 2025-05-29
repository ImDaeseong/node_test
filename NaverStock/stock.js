const puppeteer = require('puppeteer');
const { AREA_CODES } = require('./config'); 
const fs = require('fs');
const { generateHtml } = require('./htmlGenerator'); 
const { sendTelegram } = require('./push')
const cron = require('node-cron');

async function getStock(stockname, stockcode) {
    const URL = `https://finance.naver.com/item/main.nhn?code=${stockcode}`;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
        await page.goto(URL, { waitUntil: 'domcontentloaded' });

        // .wrap_company 요소가 로드될 때까지 대기 (주식 페이지에 항상 존재)
        await page.waitForSelector('.wrap_company', { timeout: 10000 });

        const result = await page.evaluate(() => {
            const getText = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim() : 'N/A';
            };

            const getCleanText = (selector) => {
                const el = document.querySelector(selector);
                if (!el) return '';

                let text = el.textContent.trim().replace(/[^\d.,+\-%]/g, '');

                // 중복된 문자열 제거 처리
                if (text.length % 2 === 0) {
                    const half = text.length / 2;
                    if (text.slice(0, half) === text.slice(half)) {
                        text = text.slice(0, half);
                    }
                }

                return text;
            };

            const getStatusText = (selector) => {
                const el = document.querySelector(selector);
                if (!el) return '';
                return el.textContent.trim().replace(/[^\p{L}]/gu, '');
            };

            const companyName = getText('.wrap_company h2 a');
            const companyCode = getText('.wrap_company .code');
            const marketTypeImg = document.querySelector('.wrap_company img');
            const marketType = marketTypeImg ? marketTypeImg.getAttribute('alt') : 'N/A';

            return {
                companyName,
                companyCode,
                marketType,

                현재가: getCleanText('#rate_info_krx .today .no_today em'),
                전일대비_상태: getStatusText('#rate_info_krx .no_exday em span.ico'),
                전일대비_가격: getCleanText('#rate_info_krx .no_exday em:nth-of-type(1)'),
                전일대비_퍼센트: getCleanText('#rate_info_krx .no_exday em:nth-of-type(2)'),

                전일가: getCleanText('.no_info tr:nth-child(1) td:nth-child(1) em'),
                고가: getCleanText('.no_info tr:nth-child(1) td:nth-child(2) em.no_up'),
                저가: getCleanText('.no_info tr:nth-child(2) td:nth-child(2) em.no_down'),

                시가: getCleanText('.no_info tr:nth-child(2) td:nth-child(1) em'),
                거래량: getCleanText('.no_info tr:nth-child(1) td:nth-child(3) em'),
                거래대금: getCleanText('.no_info tr:nth-child(2) td:nth-child(3) em') + '백만',
            };
        });

        await browser.close();

        return {
            name: stockname,
            ...result,
            time: new Date().toLocaleString('ko-KR'),
        };
    } catch (err) {
        await browser.close();
        console.error(`[오류] ${stockname}: ${err.message}`);
        return { name: stockname, error: err.message || err.toString() };
    }
}

async function runTask() {
    const results = [];
    for (const [stockname, stockcode] of Object.entries(AREA_CODES)) {
        const result = await getStock(stockname, stockcode);
        results.push(result);
    }

    results.forEach(w => {
        if (w.error) {
            console.log(`${w.name}: 오류 - ${w.error}`);
        } else {
            console.log(`[${w.name}] ${w.companyName} (${w.companyCode})`);
            console.log(`시장 구분: ${w.marketType}`);
            console.log(`현재가: ${w.현재가}`);
            console.log(`전일대비: ${w.전일대비_상태} ${w.전일대비_가격} (${w.전일대비_퍼센트})`);
            console.log(`전일가: ${w.전일가}, 고가: ${w.고가 || w.상한가}, 저가: ${w.저가 || w.하한가}`);
            console.log(`시가: ${w.시가}, 거래량: ${w.거래량}, 거래대금: ${w.거래대금}`);
            console.log(`조회시각: ${w.time}`);
            console.log('--------------------------');
        }
    });

    // Telegram 전송
    await sendTelegram(results);

    // HTML 저장
    const html = generateHtml(results);
    fs.writeFileSync('./stock_result.html', html, 'utf-8');
    console.log('\nstock_result.html 파일이 생성되었습니다.');
}

// 바로 실행
//runTask();

//30분마다 실행
cron.schedule('*/30 * * * *', () => {
    console.log('\n[자동 실행] 날씨 조회 시작...');
    runTask();
});
  
  
// 수동 실행
if (require.main === module) {
  console.log('\n[수동 실행] 날씨 조회 시작...');
  runTask();
}
  
module.exports = { runTask };