import asyncio
import websockets
import logging

logging.basicConfig(level=logging.INFO)

clients = set()
clients_lock = asyncio.Lock()

async def handler(websocket):
    
    async with clients_lock:
        clients.add(websocket)    
    #logging.info(f"새 클라이언트 연결: {websocket.remote_address} (총 {len(clients)}명)")

    try:
        async for message in websocket:
            #logging.info(f"수신 [{websocket.remote_address}]: {message}")
            await broadcast(message, sender=websocket)
            
    except websockets.exceptions.ConnectionClosedOK:
        logging.info(f"클라이언트 정상 종료: {websocket.remote_address}")
        
    except websockets.exceptions.ConnectionClosedError as e:
        logging.warning(f"클라이언트 연결 종료 오류 ({websocket.remote_address}): {e}")
        
    except Exception as e:
        logging.error(f"예기치 못한 오류 ({websocket.remote_address}): {e}")
        
    finally:
        async with clients_lock:
            clients.discard(websocket)
        #logging.info(f"클라이언트 제거됨: {websocket.remote_address} (남은 {len(clients)}명)")

async def broadcast(message, sender):
    async with clients_lock:
        recipients = [client for client in clients if client != sender]

    if recipients:
        # 병렬로 메시지 전송 시도
        results = await asyncio.gather(
            *[send_message(client, message) for client in recipients],
            return_exceptions=True
        )
        # 실패한 전송 로그 출력
        for client, result in zip(recipients, results):
            if isinstance(result, Exception):
                logging.warning(f"메시지 전송 실패 [{client.remote_address}]: {result}")

async def send_message(client, message):
    await client.send(message)
    #logging.info(f"전송 [{client.remote_address}]: {message}")

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8080):
        logging.info("서버 시작: ws://localhost:8080")
        await asyncio.Future()  # 무한 대기

if __name__ == "__main__":
    asyncio.run(main())
