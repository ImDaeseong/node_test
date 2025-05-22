const http = require('http');
const WebSocket = require('ws');

const clients = new Set();

const server = http.createServer(); 
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('새 클라이언트 연결');

  ws.on('message', (message) => {
    const textMessage = message.toString(); // 문자열로 변환 (Blob 오류 방지)

    //수신 로그 출력
    //console.log(`수신 [${ws._socket.remoteAddress}]: ${textMessage}`);

    // 다른 클라이언트에게 브로드캐스트
    for (let client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        
        // 전송 로그 출력
        //console.log(`전송 [${client._socket.remoteAddress}]: ${textMessage}`);
        
        client.send(textMessage);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('클라이언트 연결 종료');
  });

  ws.on('error', (err) => {
    console.error('WebSocket 오류:', err);
  });
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`시그널링 서버 실행 중: ws://localhost:${PORT}/ws`);
});
