const puppeteer = require('puppeteer');
const { AREA_CODES } = require('./config'); 
const fs = require('fs');
const { generateHtml } = require('./htmlGenerator'); 
const { sendTelegram } = require('./push')
const cron = require('node-cron');

async function getWeather(areaName, areaCode) {
  const URL = `https://weather.naver.com/today/${areaCode}`;

  // 브라우저 띄우기
  const browser = await puppeteer.launch({
    headless: true, //브라우저를 실행해 실제 브라우저 창 없이 백그라운드에서 동작
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  //새 탭으로 오픈
  const page = await browser.newPage();

  try {

    // 페이지 이동 및 로딩 대기
    await page.goto(URL, { waitUntil: 'networkidle2' });

    // 필수 요소가 로드될 때까지 대기(최대 10초 동안 기다림)
    await page.waitForSelector('.card_now_temperature', { timeout: 10000 });

    const result = await page.evaluate(() => {

      //해당하는 요소의 텍스트를 가져오며, 없으면 'N/A' 반환
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : 'N/A';
      };

      // 강수 확률 (오전/오후)
      const rainChances = [];
      const rainElems = document.querySelectorAll('.card_detail_time .card_time_description');
      rainElems.forEach((elem) => {
        const title = elem.querySelector('.card_description_title')?.textContent.trim();
        const value = elem.querySelector('.card_data_rain')?.textContent.trim();
        if (title && value) {
          rainChances.push(`${title}: ${value}`);
        }
      });

      return {
        temperature: getText('.card_now_temperature'),
        condition: getText('.card_detail_date .card_date_emphasis'),
        rainChance: rainChances.join(', '),
        feelsLike: getText('.type_data--temperature .card_data_emphasis'),
        humidity: getText('.type_data--humidity .card_data_emphasis'),
      };
    });

    // 브라우저 닫기
    await browser.close();

    return {
      area: areaName,
      ...result,
      time: new Date().toLocaleString('ko-KR'),
    };
  } catch (err) {
    await browser.close();
    return { area: areaName, error: err.message || err.toString() };
  }
}

async function runTask() {

  const results = [];
  for (const [area, code] of Object.entries(AREA_CODES)) {
    const result = await getWeather(area, code);
    results.push(result);
  }

  results.forEach(w => {
    if (w.error) {
      console.log(`${w.area}: 오류 - ${w.error}`);
    } else {
      console.log(`${w.area}] 온도: ${w.temperature}, 상태: ${w.condition}, 강수확률: ${w.rainChance}, 체감: ${w.feelsLike}, 습도: ${w.humidity}%`);
    }
  });

  // Telegram 전송
  await sendTelegram(results);
  

  // HTML 저장
  const html = generateHtml(results);
  fs.writeFileSync('./weather_result.html', html, 'utf-8');
  console.log('\nweather_result.html 파일이 생성되었습니다.');
}

// 바로 실행
//runTask();

// 매일 아침 8시 자동 실행
cron.schedule('0 8 * * *', () => {
  console.log('\n[자동 실행] 날씨 조회 시작...');
  runTask();
});


// 수동 실행
if (require.main === module) {
  console.log('\n[수동 실행] 날씨 조회 시작...');
  runTask();
}

module.exports = { runTask };