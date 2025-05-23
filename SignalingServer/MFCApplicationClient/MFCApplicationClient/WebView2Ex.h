#pragma once

#include <afxwin.h>
#include <wrl.h>
#include <wil/com.h>
#include <WebView2.h>
#include <sstream>

class IWebView2EventCallback {
public:
    virtual ~IWebView2EventCallback() = default;

    virtual void OnNavigationStarting(const std::wstring& uri) = 0;
    virtual void OnNavigationCompleted(bool bSuccess) = 0;
    virtual void OnSourceChanged(const std::wstring& source) = 0;
    virtual void OnDocumentTitleChanged(const std::wstring& title) = 0;
    virtual void OnWebView2Created() = 0;
    virtual void OnNewWindowRequested(const std::wstring& uri) = 0;
    virtual void OnOnAcceleratorKey() = 0;
    virtual void OnWebMessageReceived(const std::wstring& message) = 0;
};

class WebView2Ex
{
public:
    WebView2Ex();
    ~WebView2Ex();
    HRESULT Create(HWND hWnd);
    void Navigate(LPCWSTR url);
    void PostWebMessageAsString(LPCWSTR message);
    void ExecuteScript(LPCWSTR message);
    void SetBounds(int left, int top, int width, int height);
    void SetEventCallback(IWebView2EventCallback* callback) { m_eventCallback = callback; }
    
private:
    void AddEventHandlers();
    void OnNavigationStarting(ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args);
    void OnNavigationCompleted(ICoreWebView2* sender, ICoreWebView2NavigationCompletedEventArgs* args);
    void OnSourceChanged(ICoreWebView2* sender, ICoreWebView2SourceChangedEventArgs* args);
    void OnDocumentTitleChanged(ICoreWebView2* sender, IUnknown* args);
    void OnNewWindowRequested(ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args);
    HRESULT OnAcceleratorKeyPressed(ICoreWebView2AcceleratorKeyPressedEventArgs* args);
    void OnWebMessageReceived(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args);

    Microsoft::WRL::ComPtr<ICoreWebView2> m_webView;
    Microsoft::WRL::ComPtr<ICoreWebView2Environment> m_webViewEnvironment;
    Microsoft::WRL::ComPtr<ICoreWebView2Controller> m_webViewController;

    HWND m_hWnd = nullptr;
    IWebView2EventCallback* m_eventCallback = nullptr;

    EventRegistrationToken m_navigationStartingToken{};
    EventRegistrationToken m_navigationCompletedToken{};
    EventRegistrationToken m_sourceChangedToken{};
    EventRegistrationToken m_documentTitleChangedToken{};
    EventRegistrationToken m_newWindowRequestedToken{};
    EventRegistrationToken m_acceleratorKeyPressedToken{};
    EventRegistrationToken m_webMessageReceivedToken{};
};