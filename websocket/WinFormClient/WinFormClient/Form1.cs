using System;
using System.Windows.Forms;

namespace WinFormClient
{
    public partial class Form1 : Form
    {
        private WebSocketClient client;

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            client = new WebSocketClient("ws://127.0.0.1:8080/?type=pc");

            client.OnConnected += Client_OnConnected;
            client.OnDisconnected += Client_OnDisconnected;
            client.OnMessageSent += Client_OnMessageSent;
            client.OnMessageReceived += Client_OnMessageReceived;
            client.OnCode += AppendText;
        }

        private void Client_OnMessageReceived(string msg)
        {
            AppendText($"수신: {msg}");
        }

        private void Client_OnMessageSent(string msg)
        {
            AppendText($"전송 완료: {msg}");
        }

        private void Client_OnDisconnected()
        {
            AppendText("서버와 연결이 끊어졌습니다.");
        }

        private void Client_OnConnected()
        {
            AppendText("서버에 연결되었습니다.");
        }

        private async void button1_Click(object sender, EventArgs e)
        {
            await client.ConnectAsync();
        }

        private async void button2_Click(object sender, EventArgs e)
        {
            if (!string.IsNullOrWhiteSpace(textBox1.Text))
            {
                await client.SendAsync(textBox1.Text);
            }
        }

        private async void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (client != null)
            {
                await client.DisconnectAsync();
            }
        }

        private void AppendText(string text)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<string>(AppendText), text);
            }
            else
            {
                textBox2.AppendText(text + Environment.NewLine);
            }
        }
    }
}
