// server.js

const WebSocket = require('ws');

const PORT = 8080;
const BUFFER_SIZE = 2048;  // 최대 전송 크기

// WebSocket 서버 생성
const wss = new WebSocket.Server({
    host: '0.0.0.0',
    port: PORT
});

// 클라이언트 목록
const clients = {
    apps: new Set(),
    pc: null
};

console.log(`WebSocket 서버 시작됨: ws://0.0.0.0:${PORT}`);

// 클라이언트 연결 처리
wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const clientType = urlParams.get('type');

    if (!['app', 'pc'].includes(clientType)) {
        ws.close(4001, '비정상 연결 클라이언트');
        return;
    }

    if (clientType === 'app') {
        clients.apps.add(ws);
        console.log(`APP 연결됨 (현재 ${clients.apps.size}개)`);
    } else {
        if (clients.pc) {
            clients.pc.close(4002, '기존 PC 연결 해제됨');
        }
        clients.pc = ws;
        console.log('PC 연결됨');
    }

    let buffer = Buffer.alloc(0); // 데이터 저장 버퍼

    // 메시지 수신 처리
    ws.on('message', (message) => {
        buffer = Buffer.concat([buffer, message]);

        while (buffer.length >= 4) {
            let messageLength = buffer.readUInt32BE(0); // 앞 4바이트에서 메시지 길이 확인
            if (buffer.length >= 4 + messageLength) {
                let data = buffer.slice(4, 4 + messageLength);
                buffer = buffer.slice(4 + messageLength); // 사용한 데이터 제거

                handleMessage(clientType, data, ws);
            } else {
                break; // 데이터가 부족하면 대기
            }
        }
    });

    // 연결 종료 처리
    ws.on('close', () => {
        if (clientType === 'app') {
            clients.apps.delete(ws);
            console.log(`APP 연결 해제됨 (현재 ${clients.apps.size}개)`);
        } else {
            clients.pc = null;
            console.log('PC 연결 해제됨');
        }
    });
});

// 메시지 전달 함수 (가공 없이 그대로 전달)
function handleMessage(clientType, message, ws) {
    console.log(`받은 메시지 (${clientType}):`, message);

    if (clientType === 'app' && clients.pc?.readyState === WebSocket.OPEN) {
        sendData(clients.pc, message); // APP → PC
    } else if (clientType === 'pc') {
        clients.apps.forEach(app => {
            if (app.readyState === WebSocket.OPEN) {
                sendData(app, message); // PC → 모든 APP
            }
        });
    }
}

// 데이터 전송 함수 (가공 없이 그대로 전달)
function sendData(ws, data) {
    let totalLength = data.length;
    let header = Buffer.alloc(4);
    header.writeUInt32BE(totalLength, 0);
    let packet = Buffer.concat([header, data]); // 받은 데이터를 그대로 전달

    let offset = 0;
    while (offset < packet.length) {
        let chunkSize = Math.min(BUFFER_SIZE, packet.length - offset);
        ws.send(packet.slice(offset, offset + chunkSize));
        offset += chunkSize;
    }
}
