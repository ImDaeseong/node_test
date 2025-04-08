package com.daeseong.websocketapp

import android.util.Log
import okhttp3.*
import okio.ByteString
import java.nio.ByteBuffer
import java.util.concurrent.TimeUnit

class WebSocketClient(private val sUri: String, private val listener: Listener) {

    private val tag = WebSocketClient::class.java.simpleName

    interface Listener {
        fun onConnected()
        fun onDisconnected(code: Int, reason: String)
        fun onFailure(t: Throwable)
        fun onMessageReceived(jsonStr: String)
    }

    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var buffer = ByteBuffer.allocate(0)
    private val BUFFER_SIZE = 2048


    fun connect() {

        val request = Request.Builder().url(sUri).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {

                Log.d(tag, "연결 성공")
                listener.onConnected()
            }

            override fun onMessage(ws: WebSocket, bytes: ByteString) {

                buffer = ByteBuffer.wrap(buffer.array() + bytes.toByteArray())
                while (buffer.remaining() >= 4) {

                    buffer.mark()
                    val length = buffer.int

                    if (buffer.remaining() >= length) {

                        val msgBytes = ByteArray(length)
                        buffer.get(msgBytes)
                        val jsonStr = String(msgBytes)
                        listener.onMessageReceived(jsonStr)

                        val remaining = ByteArray(buffer.remaining())
                        buffer.get(remaining)
                        buffer = ByteBuffer.wrap(remaining)

                    } else {
                        buffer.reset()
                        break
                    }

                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(tag, "오류: ${t.message}")
                listener.onFailure(t)
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                Log.w(tag, "연결 종료 중: $code / $reason")
                ws.close(code, reason)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.d(tag, "연결 종료됨: $code / $reason")
                listener.onDisconnected(code, reason)
            }
        })
    }

    fun send(json: String) {

        val jsonBytes = json.toByteArray(Charsets.UTF_8)
        val lengthHeader = ByteBuffer.allocate(4).putInt(jsonBytes.size).array()
        val fullData = lengthHeader + jsonBytes

        var offset = 0
        while (offset < fullData.size) {
            val chunkSize = minOf(BUFFER_SIZE, fullData.size - offset)
            val chunk = fullData.copyOfRange(offset, offset + chunkSize)
            webSocket?.send(ByteString.of(*chunk))
            offset += chunkSize
        }
    }

    fun isOpen(): Boolean = webSocket != null

    fun close() {
        webSocket?.close(1000, "App 종료")
    }
}