const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

// Socket.IO 서버 설정
const io = new Server(server, {
  maxHttpBufferSize: 10 * 1024 * 1024 // 최대 10MB까지 버퍼 허용
});

// 정적 파일(public 폴더)
app.use(express.static('public'));

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 다운로드 라우트
app.get('/download/:filename', (req, res) => {
   
    // 클라이언트가 요청한 파일 이름  
    const filename = req.params.filename;  
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
        // 파일 다운로드 응답
        res.download(filePath);  
    } else {    
        res.status(404).send('파일을 찾을 수 없습니다.');  
    }
});

// 방 정보 저장 객체
const rooms = {}; // { roomName: { users: { socketId: nickname }, admin: socketId } }

// 파일 크기 제한 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 허용된 파일 확장자
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];

io.on('connection', (socket) => {
  console.log('새 사용자 접속:', socket.id);

  // 방 입장 요청 처리
  socket.on('join room', ({ roomName, nickname }) => {

    // 유효성 검사
    if (!roomName || !nickname || typeof roomName !== 'string' || typeof nickname !== 'string') {
        return socket.emit('error', '잘못된 요청입니다.');
    }

    // 방 이름, 닉네임 공백 제거
    roomName = roomName.trim();
    nickname = nickname.trim();

    if (!roomName || !nickname) return;

    // 중복 닉네임 체크
    if (rooms[roomName]) {
      const isDuplicate = Object.values(rooms[roomName].users).includes(nickname);
      if (isDuplicate) {
        socket.emit('nickname exists', nickname);
        return;
      }
    }

    socket.join(roomName);
    socket.nickname = nickname;
    socket.roomName = roomName;

    // 방 생성 및 관리자 지정
    if (!rooms[roomName]) {
      rooms[roomName] = { users: {}, admin: socket.id };
    }

    rooms[roomName].users[socket.id] = nickname;

    const isAdmin = rooms[roomName].admin === socket.id;

    // 입장 메시지 및 사용자 목록 업데이트
    io.to(roomName).emit('chat message', `${nickname} 님이 입장했습니다.`); // 입장 메시지 방송
    io.to(roomName).emit('user list', getUserList(roomName)); // 사용자 목록 전송

    // 관리자 상태 알림 (본인에게만)
    socket.emit('admin status', isAdmin);

    // UI 상태 변경 신호 (본인에게)
    socket.emit('joined room', { roomName, nickname, isAdmin });
  });

  // 채팅 메시지 처리
  socket.on('chat message', (msg) => {
    const roomName = socket.roomName;
    if (roomName && rooms[roomName]) {
      io.to(roomName).emit('chat message', `${socket.nickname}: ${msg}`);
    }
  });

  // 파일 전송 처리
  socket.on('file send', (data) => {
    const roomName = socket.roomName;
    if (!roomName || !rooms[roomName]) {
      socket.emit('file error', '방에 입장하지 않았습니다.');
      return;
    }

    const { fileName, fileBuffer } = data;
    
    // 파일 크기 검증
    if (fileBuffer.byteLength > MAX_FILE_SIZE) {
      socket.emit('file error', '파일 크기가 5MB를 초과합니다.');
      return;
    }

    // 파일 확장자 검증
    const fileExt = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      socket.emit('file error', '허용되지 않는 파일 형식입니다.');
      return;
    }

    try {

      // 고유한 파일명 생성 (시간스탬프 + 원본파일명)
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Buffer로 변환하여 파일 저장
      const buffer = Buffer.from(fileBuffer);
      
      fs.writeFileSync(filePath, buffer);
      console.log('파일 저장 성공:', filePath);

      // 방의 모든 사용자에게 파일 정보 전송
      io.to(roomName).emit('file receive', {
        fileName: fileName,
        uniqueFileName: uniqueFileName,
        sender: socket.nickname,
        fileSize: buffer.length,
        timestamp: new Date().toLocaleTimeString()
      });

      // 채팅에 파일 전송 메시지 추가
      io.to(roomName).emit('chat message', `${socket.nickname} 님이 파일을 전송했습니다: ${fileName}`);

    } catch (error) {
      console.error('파일 저장 실패:', error);
      socket.emit('file error', '파일 저장에 실패했습니다.');
    }
  });

  // 방 퇴장 처리
  socket.on('leave room', () => {
    handleLeaveRoom(socket);
  });

   // 연결 종료 시 
  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id);
    handleLeaveRoom(socket);
  });

  // 방 나가기 및 관리자 재지정
  function handleLeaveRoom(socket) {
    const roomName = socket.roomName;
    if (!roomName || !rooms[roomName]) return;

    const nickname = socket.nickname;
    delete rooms[roomName].users[socket.id];

    // 사용자 퇴장 메시지
    io.to(roomName).emit('chat message', `${nickname} 님이 퇴장했습니다.`);

    // 관리자 변경
    if (rooms[roomName].admin === socket.id) {
      const userIds = Object.keys(rooms[roomName].users);
      if (userIds.length > 0) {
        rooms[roomName].admin = userIds[0];
        io.to(rooms[roomName].admin).emit('admin status', true);
        io.to(roomName).emit('chat message', `${rooms[roomName].users[userIds[0]]} 님이 새로운 관리자가 되었습니다.`);
      } else {
        delete rooms[roomName]; // 방 비었으면 삭제
        return;
      }
    }

    io.to(roomName).emit('user list', getUserList(roomName));

    // socket 속성 정리
    socket.leave(roomName);
    socket.roomName = null;
    socket.nickname = null;
  }

  // 사용자 목록 구성
  function getUserList(roomName) {
    if (!rooms[roomName]) return [];
    return Object.entries(rooms[roomName].users).map(([id, name]) => ({
      name,
      isAdmin: rooms[roomName].admin === id,
    }));
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});