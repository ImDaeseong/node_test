#pragma once
#include "EdgeWebBrowser.h"

class CMFCApplicationClientDlg : public CDialogEx
{
public:
	CMFCApplicationClientDlg(CWnd* pParent = nullptr);	// 표준 생성자입니다.

#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_MFCAPPLICATIONCLIENT_DIALOG };
#endif

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV 지원입니다.

protected:
	virtual BOOL OnInitDialog();
	afx_msg void OnPaint();
	afx_msg void OnSize(UINT nType, int cx, int cy);
	afx_msg void OnDestroy();
	afx_msg void OnBnClickedButton1();
	DECLARE_MESSAGE_MAP()

private:
	void initWebView();
	void NavigateWebView();
	void ResizeWebView();

	std::unique_ptr<CWebBrowser> m_pWebBrowser{};	
};
