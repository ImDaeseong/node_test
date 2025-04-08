package com.daeseong.websocketapp

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private val tag = MainActivity::class.java.simpleName

    private lateinit var client: WebSocketClient

    private lateinit var btn1: Button
    private lateinit var et1: EditText
    private lateinit var tv1: TextView

    private var sMsg: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        init()

        btn1 = findViewById(R.id.btn1)
        et1 = findViewById(R.id.et1)
        tv1 = findViewById(R.id.tv1)

        btn1.setOnClickListener {

            sMsg= et1.text.toString()

            val json = JSONObject().apply {
                put("type", "app")
                put("send", "message")
                put("content", sMsg)
            }
            client.send(json.toString())
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        if (::client.isInitialized) {
            client.close()
        }
    }

    private fun init() {

        //Echo Test
        //val sUrl = "wss://echo.websocket.events"
        val sUrl = "ws://127.0.0.1:8080?type=app"

        client = WebSocketClient(sUrl, object : WebSocketClient.Listener {

            override fun onConnected() {
                runOnUiThread {
                    appendLog("연결 성공")
                }
            }

            override fun onDisconnected(code: Int, reason: String) {
                runOnUiThread { appendLog("연결 종료됨 ($code): $reason") }
            }

            override fun onFailure(t: Throwable) {
                runOnUiThread { appendLog("연결 오류: ${t.localizedMessage}") }
            }

            override fun onMessageReceived(jsonStr: String) {
                runOnUiThread {
                    try {
                        val json = JSONObject(jsonStr)
                        appendLog(json.toString(4))
                    } catch (e: Exception) {
                        appendLog("JSON 파싱 오류: $jsonStr")
                    }
                }
            }
        })

        client.connect()
    }

    private fun appendLog(msg: String) {
        tv1.append("$msg\n")
    }
}