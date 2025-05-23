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
	m_webViewEx = nullptr;
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

	if (FAILED(CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED)))
	{
		return FALSE;
	}

	m_webViewEx = std::make_unique<WebView2Ex>();
	m_webViewEx->SetEventCallback(this);

	if (FAILED(m_webViewEx->Create(GetSafeHwnd())))
	{
		return FALSE;
	}

	return TRUE; 
}

void CMFCApplicationClientDlg::OnPaint()
{
	CPaintDC dc(this);
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
    m_webViewEx.reset();
    CoUninitialize();
}

void CMFCApplicationClientDlg::OnNavigationStarting(const std::wstring& uri)
{
    CString strMsg;
    strMsg.Format(_T("OnNavigationStarting: %s"), uri.c_str());
}

void CMFCApplicationClientDlg::OnNavigationCompleted(bool bSuccess)
{
    CString strMsg = bSuccess ? _T("OnNavigationCompleted successfully.") : _T("OnNavigationCompleted failed.");

    if (bSuccess)
    {
        //ResizeWebView();
    }
}

void CMFCApplicationClientDlg::OnSourceChanged(const std::wstring& source)
{
    CString strMsg;
    strMsg.Format(_T("OnSourceChanged: %s"), source.c_str());
}

void CMFCApplicationClientDlg::OnDocumentTitleChanged(const std::wstring& title)
{
    SetWindowText(title.c_str());
}

void CMFCApplicationClientDlg::OnWebMessageReceived(const std::wstring& message)
{
    CString strMsg = _T("");
    strMsg.Format(_T("OnWebMessageReceived: %s"), message.c_str());
    SetDlgItemText(IDC_EDIT1, strMsg);
}

//브라우저 생성 완료시
void CMFCApplicationClientDlg::OnWebView2Created()
{
    if (m_webViewEx)
    {
        m_webViewEx->Navigate(L"file:///E:/node_test/SignalingServer/webrtc.html");

        ResizeWebView();
    }
}

//새페이지 및 팝업 호출시
void CMFCApplicationClientDlg::OnNewWindowRequested(const std::wstring& uri)
{
    CString strMsg;
    strMsg.Format(_T("OnNewWindowRequested: %s"), uri.c_str());
}

//단추키 호출
void CMFCApplicationClientDlg::OnOnAcceleratorKey()
{
    AfxMessageBox(_T("단추키 호출"));
}

void CMFCApplicationClientDlg::ResizeWebView()
{
    if (m_webViewEx)
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

        m_webViewEx->SetBounds(nleft, webViewTop, nwidth, webViewHeight);
    }
}

void CMFCApplicationClientDlg::OnBnClickedButton1()
{
    CString strMsg;
    GetDlgItem(IDC_EDIT1)->GetWindowText(strMsg);

    //자바스크립트 호출로 메시지 전달
    CString strSend;
    strSend.Format(_T("receiveFromForm('%s');"), strMsg);

    if (m_webViewEx)
    {
        m_webViewEx->ExecuteScript(strSend);
    }
}
