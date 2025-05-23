#include "pch.h"
#include "WebView2Ex.h"

WebView2Ex::WebView2Ex() 
{    
    m_hWnd = nullptr;
    m_eventCallback = nullptr;
    m_webView = nullptr;
    m_webViewController = nullptr;
    m_webViewEnvironment = nullptr;

    m_navigationCompletedToken = { 0 };
    m_navigationStartingToken = { 0 };
    m_documentTitleChangedToken = { 0 };
    m_acceleratorKeyPressedToken = { 0 };
    m_sourceChangedToken = { 0 };
    m_newWindowRequestedToken = { 0 };
    m_webMessageReceivedToken = { 0 };
}

WebView2Ex::~WebView2Ex() {

    if (m_webView)
    {
        m_webView->remove_NavigationStarting(m_navigationStartingToken);
        m_webView->remove_NavigationCompleted(m_navigationCompletedToken);
        m_webView->remove_SourceChanged(m_sourceChangedToken);
        m_webView->remove_DocumentTitleChanged(m_documentTitleChangedToken);
        m_webView->remove_NewWindowRequested(m_newWindowRequestedToken); 
        m_webView->remove_WebMessageReceived(m_webMessageReceivedToken);
    }

    // AcceleratorKeyPressed 이벤트 해제
    if (m_acceleratorKeyPressedToken.value != 0 && m_webViewController)
    {
        m_webViewController->remove_AcceleratorKeyPressed(m_acceleratorKeyPressedToken);
    }

    // 컨트롤러 닫기
    if (m_webViewController)
    {
        m_webViewController->Close();
    }
   
    m_webView = nullptr;
    m_webViewController = nullptr;
    m_webViewEnvironment = nullptr;
}

HRESULT WebView2Ex::Create(HWND hWnd)
{
    m_hWnd = hWnd;

    return CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, nullptr,
        Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [this](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
                
                if (SUCCEEDED(result))
                {
                    m_webViewEnvironment = env;
                    return m_webViewEnvironment->CreateCoreWebView2Controller(m_hWnd,
                        Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                            [this](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                                
                                if (SUCCEEDED(result))
                                {
                                    m_webViewController = controller;
                                    m_webViewController->get_CoreWebView2(&m_webView);
                                    
                                    if (m_webView)
                                    {
                                        AddEventHandlers();
                                        
                                        ICoreWebView2Settings* Settings = nullptr;
                                        m_webView->get_Settings(&Settings);
                                        Settings->put_IsScriptEnabled(TRUE);
                                        Settings->put_AreDefaultScriptDialogsEnabled(TRUE);
                                        Settings->put_IsWebMessageEnabled(TRUE);

                                        // 상태 표시줄 비활성화 추가
                                        Settings->put_IsStatusBarEnabled(FALSE);

                                        // 기본 컨텍스트 메뉴 비활성화 추가
                                        Settings->put_AreDefaultContextMenusEnabled(FALSE);

                                        Settings->Release();

                                        RECT bounds;
                                        GetClientRect(m_hWnd, &bounds);
                                        m_webViewController->put_Bounds(bounds);

                                        //m_webView->Navigate(L"https://www.naver.com");

                                        if (m_eventCallback) m_eventCallback->OnWebView2Created();
                                    }
                                }
                                return S_OK;
                            }).Get());
                }
                return S_OK;
            }).Get());
}

void WebView2Ex::Navigate(LPCWSTR url)
{
    if (m_webView)
    {
        m_webView->Navigate(url);
    }    
}

//웹페이지로 메시지 전달
void WebView2Ex::PostWebMessageAsString(LPCWSTR message)
{
    if (m_webView)
    {
        m_webView->PostWebMessageAsString(message);
    }
}

void WebView2Ex::ExecuteScript(LPCWSTR message)
{
    if (m_webView)
    {
        m_webView->ExecuteScript(message, nullptr);
    }
}

void WebView2Ex::SetBounds(int left, int top, int width, int height)
{
    if (m_webViewController)
    {
        RECT bounds = { left, top, left + width, top + height };
        m_webViewController->put_Bounds(bounds);
    }
}

void WebView2Ex::AddEventHandlers()
{
    if (m_webView)
    {
        m_webView->add_NavigationStarting(Microsoft::WRL::Callback<ICoreWebView2NavigationStartingEventHandler>(
            [this](ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT {
                OnNavigationStarting(sender, args);
                return S_OK;
            }).Get(), &m_navigationStartingToken);

        m_webView->add_NavigationCompleted(Microsoft::WRL::Callback<ICoreWebView2NavigationCompletedEventHandler>(
            [this](ICoreWebView2* sender, ICoreWebView2NavigationCompletedEventArgs* args) -> HRESULT {
                OnNavigationCompleted(sender, args);
                return S_OK;
            }).Get(), &m_navigationCompletedToken);

        m_webView->add_SourceChanged(Microsoft::WRL::Callback<ICoreWebView2SourceChangedEventHandler>(
            [this](ICoreWebView2* sender, ICoreWebView2SourceChangedEventArgs* args) -> HRESULT {
                OnSourceChanged(sender, args);
                return S_OK;
            }).Get(), &m_sourceChangedToken);

        m_webView->add_DocumentTitleChanged(Microsoft::WRL::Callback<ICoreWebView2DocumentTitleChangedEventHandler>(
            [this](ICoreWebView2* sender, IUnknown* args) -> HRESULT {
                OnDocumentTitleChanged(sender, args);
                return S_OK;
            }).Get(), &m_documentTitleChangedToken);
      
        m_webView->add_NewWindowRequested(Microsoft::WRL::Callback<ICoreWebView2NewWindowRequestedEventHandler>(
            [this](ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args) -> HRESULT {                
                OnNewWindowRequested(sender, args);
                return S_OK;
            }).Get(), &m_newWindowRequestedToken);

        m_webViewController->add_AcceleratorKeyPressed(Microsoft::WRL::Callback<ICoreWebView2AcceleratorKeyPressedEventHandler>(
            [this](ICoreWebView2Controller*, ICoreWebView2AcceleratorKeyPressedEventArgs* args) -> HRESULT {
                return OnAcceleratorKeyPressed(args);
            }).Get(), &m_acceleratorKeyPressedToken);

        m_webView->add_WebMessageReceived(
            Microsoft::WRL::Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                [this](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                    OnWebMessageReceived(sender, args);
                    return S_OK;
                }).Get(), &m_webMessageReceivedToken);

    }
}

void WebView2Ex::OnNavigationStarting(ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args)
{
    wil::unique_cotaskmem_string uri;
    args->get_Uri(&uri);
    if (m_eventCallback) m_eventCallback->OnNavigationStarting(uri.get());
}

void WebView2Ex::OnNavigationCompleted(ICoreWebView2* sender, ICoreWebView2NavigationCompletedEventArgs* args)
{
    BOOL bSuccess;
    args->get_IsSuccess(&bSuccess);
    if (m_eventCallback) m_eventCallback->OnNavigationCompleted(bSuccess);
}

void WebView2Ex::OnSourceChanged(ICoreWebView2* sender, ICoreWebView2SourceChangedEventArgs* args)
{
    wil::unique_cotaskmem_string source;
    sender->get_Source(&source);
    if (m_eventCallback) m_eventCallback->OnSourceChanged(source.get());
}

void WebView2Ex::OnDocumentTitleChanged(ICoreWebView2* sender, IUnknown* args)
{
    wil::unique_cotaskmem_string title;
    sender->get_DocumentTitle(&title);
    if (m_hWnd && title)
    {
        ::SetWindowText(m_hWnd, title.get());
    }
    if (m_eventCallback) m_eventCallback->OnDocumentTitleChanged(title.get());
}

void WebView2Ex::OnNewWindowRequested(ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args)
{
    wil::unique_cotaskmem_string uri;
    args->get_Uri(&uri);

    ///*
    //팝업 호출 금지 -내부에서 페이지 변경됨
    sender->Navigate(uri.get());
    //*/
    
    /*
    //별도 페이지 처리시 url 를 받아서 webView 별도 처리시
    //sender->Navigate(uri.get());
    */

    args->put_Handled(TRUE);

    if (m_eventCallback) m_eventCallback->OnNewWindowRequested(uri.get());
}

HRESULT WebView2Ex::OnAcceleratorKeyPressed(ICoreWebView2AcceleratorKeyPressedEventArgs* args) 
{
    COREWEBVIEW2_KEY_EVENT_KIND kind;
    if (FAILED(args->get_KeyEventKind(&kind)) || kind != COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN)
        return S_OK;

    UINT32 key = 0;
    if (FAILED(args->get_VirtualKey(&key)))
        return S_OK;

    const bool ctrl = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
    const bool shift = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
    const bool alt = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;

    if (key == VK_F1)
    {
        args->put_Handled(TRUE);
        return S_OK;
    }

    if (key == 0x59 && ctrl && shift && alt)
    {
        args->put_Handled(TRUE);
        if (m_eventCallback)
        {
            m_eventCallback->OnOnAcceleratorKey();
        }
        return S_OK;
    }

    // Ctrl + Shift + R (Refresh)
    if (ctrl && shift && key == 'R')
    {
        args->put_Handled(TRUE);
        return S_OK;
    }

    if (key == VK_CANCEL && ctrl)
    {
        args->put_Handled(TRUE);
        return S_OK;
    }

    return S_OK;
}

void WebView2Ex::OnWebMessageReceived(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args)
{
    wil::unique_cotaskmem_string message;
    args->TryGetWebMessageAsString(&message);
   
    if (m_eventCallback) m_eventCallback->OnWebMessageReceived(message.get());
}