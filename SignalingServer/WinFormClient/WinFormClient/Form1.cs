using System;
using System.Windows.Forms;

namespace WinFormClient
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
            Init();
        }
            
        private async void Init()
        {
            await webView21.EnsureCoreWebView2Async(null);
            webView21.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

            //경로에서 html 가져오기
            /*
            string sHtmlPath = string.Format("{0}\\webrtc.html", Application.StartupPath);
            webView21.CoreWebView2.Navigate(sHtmlPath);
            */

            //리소스에서 html 가져오기
            string sHtmlPath = Properties.Resources.webrtc;             
            webView21.CoreWebView2.NavigateToString(sHtmlPath);
        }

        private void CoreWebView2_WebMessageReceived(object sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
        {
            //웹페이지에서 전달받은 메시지
            string strMessage = e.TryGetWebMessageAsString();

            textBox2.AppendText($"[웹페이지에서 WinForm으로]: {strMessage}\r\n");
        }

        private void Send_Click(object sender, EventArgs e)
        {
            string strMessage = textBox1.Text;
            if (!string.IsNullOrWhiteSpace(strMessage))
            {
                //웹페이지로 메시지 전달
                string js = $"window.receiveFromForm({System.Text.Json.JsonSerializer.Serialize(strMessage)});";
                webView21.CoreWebView2.ExecuteScriptAsync(js);

                textBox2.AppendText($"[WinForm에서 웹페이지로]: {strMessage}\r\n");
                textBox1.Clear();
            }
        }

    }
}
