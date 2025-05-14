const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log('WebSocket 서버 시작: ws://localhost:8080');
});

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('클라이언트 접속');
  clients.add(ws);

  ws.on('message', (message) => {
    const msg = message.toString();
    console.log('수신 메시지:', msg);

    // 연결된 다른 클라이언트에게 브로드캐스트
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  });

  ws.on('close', () => {
    console.log('클라이언트 접속 해제');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket 오류:', err.message);
  });
});
