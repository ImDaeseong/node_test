const fs = require('fs');
const https = require('https');
const express = require('express');
const path = require('path');
const app = express();

const httpPort = 8080;
const httpsPort = 443;

// 인증서
const credentials = {
  key: fs.readFileSync('./cert/server.key'),
  cert: fs.readFileSync('./cert/server.crt'),
};

// 정적 파일 제공 (HTML 포함)
app.use(express.static(path.join(__dirname, 'public')));

// 미들웨어 - application/json과 application/x-www-form-urlencoded 형태 요청 본문을 파싱
app.use(express.json({ limit: '1mb' })); //최대 용량은 1MB로 제한
app.use(express.urlencoded({ extended: true, limit: '1mb' })); //최대 용량은 1MB로 제한

// 응답 생성 함수
function createResponse(method, data, query = {}) {
  return {
    message: `${method} 요청이 정상 처리되었습니다.`,
    method,
    receivedQuery: query,
    receivedBody: data,
    timestamp: new Date().toISOString(),
  };
}

// GET 처리
app.get('/postman', (req, res) => {
  console.log('[GET] 요청 수신:', req.query);
  res.json(createResponse('GET', null, req.query));
});

// POST 처리
app.post('/postman', (req, res) => {
  console.log('[POST] 요청 수신:', req.body);
  res.json(createResponse('POST', req.body));
});

// HTTP 서버
app.listen(httpPort, () => {
  console.log(`HTTP 서버 실행: http://localhost:${httpPort}`);
});

// HTTPS 서버
https.createServer(credentials, app).listen(httpsPort, () => {
  console.log(`HTTPS 서버 실행: https://localhost:${httpsPort}`);
});

//http://localhost:8080/test.html
//https://localhost:443/test.html
//http://localhost:8080/postman?msg=GET 요청 테스트
//https://localhost:443/postman?msg=GET 요청 테스트
//http://localhost:8080/postman
//https://localhost:443/postman