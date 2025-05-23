#include "pch.h"
#include "framework.h"
#include "MFCApplicationClient.h"
#include "MFCApplicationClientDlg.h"
#include "afxdialogex.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

CMFCApplicationClientDlg::CMFCApplicationClientDlg(CWnd* pParent /*=nullptr*/)
	: CDialogEx(IDD_MFCAPPLICATIONCLIENT_DIALOG, pParent)
{
    m_pWebBrowser = nullptr;
}

void CMFCApplicationClientDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CMFCApplicationClientDlg, CDialogEx)
	ON_WM_PAINT()
	ON_WM_SIZE()
	ON_WM_DESTROY()
	ON_BN_CLICKED(IDC_BUTTON1, &CMFCApplicationClientDlg::OnBnClickedButton1)
END_MESSAGE_MAP()

BOOL CMFCApplicationClientDlg::OnInitDialog()
{
	CDialogEx::OnInitDialog();

    CoInitialize(NULL);

    initWebView();
	ResizeWebView();

	return TRUE; 
}

void CMFCApplicationClientDlg::OnPaint()
{
	CPaintDC dc(this);
}
void CMFCApplicationClientDlg::ResizeWebView()
{
	if (m_pWebBrowser)
	{
		RECT rRect;
		::GetClientRect(GetSafeHwnd(), &rRect);

		int nMargin = 20;
		int nHeight = 60;

		int nleft = rRect.left + nMargin;
		int nwidth = rRect.right - rRect.left - nMargin * 2;

		// 에디트 박스
		int editTop = rRect.bottom - nHeight - nMargin;

		HWND hEdit = GetDlgItem(IDC_EDIT1)->GetSafeHwnd();
		if (hEdit)
		{
			::MoveWindow(hEdit, nleft, editTop, nwidth, nHeight, TRUE);
		}

		// 버튼
		int buttonTop = editTop - nHeight - 10; // 10px 간격

		HWND hButton = GetDlgItem(IDC_BUTTON1)->GetSafeHwnd();
		if (hButton)
		{
			::MoveWindow(hButton, nleft, buttonTop, nwidth, nHeight, TRUE);
		}

		// 웹뷰
		int webViewTop = rRect.top + nMargin;
		int webViewHeight = buttonTop - webViewTop - 10; // 버튼과 10px 간격

		if (m_pWebBrowser && m_pWebBrowser->GetSafeHwnd())
		{
			m_pWebBrowser->MoveWindow(nleft, webViewTop, nwidth, webViewHeight, TRUE);
		}
	}
}

void CMFCApplicationClientDlg::OnSize(UINT nType, int cx, int cy)
{
    CDialogEx::OnSize(nType, cx, cy);

    //시작시 호출 않됨 - m_webViewEx 가 완료되지 않아서
    ResizeWebView();
}

void CMFCApplicationClientDlg::OnDestroy()
{
    CDialogEx::OnDestroy();
    
    if (m_pWebBrowser)
    {
        //명시적 자원 해제(CWebBrowser::~CWebBrowser 호출됨)
        m_pWebBrowser.reset();
    }

    CoUninitialize();
}

void CMFCApplicationClientDlg::initWebView()
{
	CRect rectClient;
	GetClientRect(rectClient);

	HWND hWndParent = this->GetSafeHwnd();

	m_pWebBrowser = std::make_unique<CWebBrowser>();
	if (m_pWebBrowser != nullptr)
	{
		m_pWebBrowser->CreateAsync(
			WS_VISIBLE | WS_CHILD,
			rectClient,
			this,
			1,
			[this]() {
				CString strParam("");
				CString content(strParam);
				CString headers(_T("Content-Type: application/x-www-form-urlencoded"));
                m_pWebBrowser->SetParentView(this);
				m_pWebBrowser->DisablePopups();
				m_pWebBrowser->NavigatePost(L"file:///E:/node_test/SignalingServer/webrtc.html", content, headers, this->GetSafeHwnd());
				m_pWebBrowser->RegisterCallback(CWebBrowser::CallbackType::TitleChanged, [this]() {
					CString title = m_pWebBrowser->GetTitle();
					AfxGetMainWnd()->SetWindowText(title);
					});

				m_pWebBrowser->RegisterCallback(CWebBrowser::CallbackType::AcceleratorKey, [this]() {
					SetDlgItemText(IDC_EDIT1, _T("단추키 호출"));
					});

				m_pWebBrowser->RegisterCallback(CWebBrowser::CallbackType::WebMessageReceived, [this]() {
					CString strMsg = m_pWebBrowser->GetReceiveMessage();
					strMsg.Format(_T("OnWebMessageReceived: %s"), strMsg);
					SetDlgItemText(IDC_EDIT1, strMsg);
					});

			});
	}
}

void CMFCApplicationClientDlg::OnBnClickedButton1()
{
	CString strMsg;
	GetDlgItem(IDC_EDIT1)->GetWindowText(strMsg);

	//자바스크립트 호출로 메시지 전달
	CString strSend;
	strSend.Format(_T("receiveFromForm('%s');"), strMsg);

	if (m_pWebBrowser)
	{
		m_pWebBrowser->ExecuteScript(strSend);
	}
}
