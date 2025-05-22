package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn *websocket.Conn
	Send chan []byte
}

var (
	clients    = make(map[*Client]bool)
	clientsMux sync.Mutex
	upgrader   = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
)

func (c *Client) ReadMessage() {
	defer func() {
		// 클라이언트 제거 및 연결 종료
		clientsMux.Lock()
		delete(clients, c)
		clientsMux.Unlock()

		// WriteMessage 루프 종료 유도
		close(c.Send)
		c.conn.Close()
		log.Println("클라이언트 연결 종료")
	}()

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			//읽기 오류: websocket: close 1001 (going away) - 클라이언트(브라우저, 앱 등)가 페이지를 닫거나, 네트워크 연결이 끊기거나, 새로고침한 경우 발생
			log.Println("읽기 오류:", err)
			break
		}

		//클라이언트가 보낸 메시지 로그 출력
		//log.Printf("수신 [%p]: %s\n", c, string(msg))

		// 수신한 메시지를 다른 클라이언트에 브로드캐스트
		BroadcastMessage(msg, c)
	}
}

func BroadcastMessage(msg []byte, sender *Client) {

	clientsMux.Lock()

	// 슬라이스 복사본을 이용해 안전하게 메시지를 전송
	clientsCopy := make([]*Client, 0, len(clients))
	for c := range clients {
		if c != sender {
			clientsCopy = append(clientsCopy, c)
		}
	}
	clientsMux.Unlock()

	for _, c := range clientsCopy {
		select {
		case c.Send <- msg:
		default:
			log.Println("Send 채널이 가득 참. 클라이언트 제거")
			clientsMux.Lock()
			delete(clients, c)
			close(c.Send)
			clientsMux.Unlock()
		}
	}

}

func (c *Client) WriteMessage() {
	defer func() {
		c.conn.Close()
	}()

	for msg := range c.Send {

		//서버가 클라이언트에 보내는 메시지 로그 출력
		//log.Printf("전송 [%p]: %s\n", c, string(msg))

		err := c.conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			log.Println("쓰기 오류:", err)
			break
		}
	}

}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket 업그레이드 실패:", err)
		return
	}

	c := &Client{
		conn: ws,
		Send: make(chan []byte, 256),
	}

	clientsMux.Lock()
	clients[c] = true
	clientsMux.Unlock()

	log.Println("새 클라이언트 연결")

	go c.WriteMessage()
	c.ReadMessage()
}

func main() {

	http.HandleFunc("/ws", handleConnections)

	log.Println("서버 시작: http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}
