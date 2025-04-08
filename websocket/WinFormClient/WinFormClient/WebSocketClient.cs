using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace WinFormClient
{
    public delegate void OnClientReceiveMsgDelegate(string message);
    public delegate void OnClientConnectDelegate();
    public delegate void OnClientDisConnectDelegate();
    public delegate void OnClientSendCompleteDelegate(int bytesSent);

    public class WebSocketClient : IDisposable
    {
        private ClientWebSocket ws;
        private Uri uri;
        private CancellationTokenSource cts;
        private List<byte> messageBuffer = new List<byte>(2048);
        private const int BUFFER_SIZE = 2048;
        private bool disposed = false;
        private static readonly Encoding Utf8 = Encoding.UTF8;
        private Task receiveTask;

        public event OnClientConnectDelegate OnConnected;
        public event OnClientDisConnectDelegate OnDisconnected;
        public event OnClientReceiveMsgDelegate OnMessageReceived;
        public event OnClientSendCompleteDelegate OnMessageSent;

        public WebSocketClient(string url)
        {
            uri = new Uri(url);
        }

        public async Task ConnectAsync()
        {
            await DisconnectAsync().ConfigureAwait(false);

            ws = new ClientWebSocket();
            ws.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);
            cts = new CancellationTokenSource();

            try
            {
                await ws.ConnectAsync(uri, cts.Token).ConfigureAwait(false);
                OnConnected?.Invoke();
                receiveTask = Task.Run(() => ReceiveLoopAsync());
            }
            catch (Exception ex)
            {
                Console.WriteLine("연결 실패: " + ex.Message);
            }
        }

        public async Task DisconnectAsync()
        {
            if (ws == null) return;

            var localCts = cts;
            cts = null;

            try
            {
                localCts?.Cancel();

                if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client closing", CancellationToken.None).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("연결 종료 중 오류: " + ex.Message);
            }
            finally
            {
                try { ws.Dispose(); } catch { }
                ws = null;

                localCts?.Dispose();
                OnDisconnected?.Invoke();
            }
        }

        public async Task SendAsync(string message)
        {
            if (string.IsNullOrWhiteSpace(message) || ws == null || ws.State != WebSocketState.Open)
                return;

            var payload = new { type = "pc", content = message };
            string json = JsonSerializer.Serialize(payload);
            byte[] data = Utf8.GetBytes(json);

            byte[] lengthPrefix = BitConverter.GetBytes(data.Length);
            if (BitConverter.IsLittleEndian)
            {
                Array.Reverse(lengthPrefix);
            }

            byte[] packet = new byte[4 + data.Length];
            Buffer.BlockCopy(lengthPrefix, 0, packet, 0, 4);
            Buffer.BlockCopy(data, 0, packet, 4, data.Length);

            try
            {
                await ws.SendAsync(new ArraySegment<byte>(packet), WebSocketMessageType.Binary, true, CancellationToken.None).ConfigureAwait(false);
                OnMessageSent?.Invoke(packet.Length);
                Console.WriteLine("보낸 메시지: " + message);
            }
            catch (Exception ex)
            {
                Console.WriteLine("메시지 전송 오류: " + ex.Message);
            }
        }

        private async Task ReceiveLoopAsync()
        {
            var buffer = new byte[BUFFER_SIZE];

            try
            {
                while (ws != null && ws.State == WebSocketState.Open && cts != null && !cts.IsCancellationRequested)
                {
                    WebSocketReceiveResult result;
                    try
                    {
                        result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token).ConfigureAwait(false);
                    }
                    catch (OperationCanceledException) { break; }
                    catch (ObjectDisposedException) { break; }
                    catch (Exception ex)
                    {
                        Console.WriteLine("데이터 수신 오류: " + ex.Message);
                        break;
                    }

                    if (result == null || result.MessageType == WebSocketMessageType.Close) break;

                    messageBuffer.AddRange(new ArraySegment<byte>(buffer, 0, result.Count));
                    ProcessMessages();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("수신 루프 오류: " + ex.Message);
            }
            finally
            {
                await DisconnectAsync().ConfigureAwait(false);
            }
        }

        private void ProcessMessages()
        {
            while (messageBuffer.Count >= 4)
            {
                byte[] lengthBytes = messageBuffer.GetRange(0, 4).ToArray();
                if (BitConverter.IsLittleEndian)
                    Array.Reverse(lengthBytes);

                int length = BitConverter.ToInt32(lengthBytes, 0);

                if (messageBuffer.Count < 4 + length)
                    break;

                byte[] payload = messageBuffer.GetRange(4, length).ToArray();
                messageBuffer.RemoveRange(0, 4 + length);

                string message = Utf8.GetString(payload);
                HandleMessage(message);
            }
        }

        private void HandleMessage(string message)
        {
            try
            {
                using (var doc = JsonDocument.Parse(message))
                {
                    var root = doc.RootElement;
                    string type = root.GetProperty("type").GetString();
                    string content = root.GetProperty("content").GetString();
                    OnMessageReceived?.Invoke(string.Format("[{0}] {1}", type, content));
                }
            }
            catch (JsonException ex)
            {
                Console.WriteLine("JSON 파싱 오류: " + ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine("메시지 처리 오류: " + ex.Message);
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!disposed)
            {
                if (disposing)
                {
                    try
                    {
                        DisconnectAsync().GetAwaiter().GetResult();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Dispose 중 오류: " + ex.Message);
                    }
                }
                disposed = true;
            }
        }

        ~WebSocketClient()
        {
            Dispose(false);
        }
    }
}
