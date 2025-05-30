package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"bytes"

	"net/http"

	"github.com/chromedp/chromedp"
	"github.com/robfig/cron/v3"
)

// 주식 정보 구조체 선언
type StockInfo struct {
	Name        string `json:"name"`            // 관심 종목명
	CompanyName string `json:"companyName"`     // 회사명
	CompanyCode string `json:"companyCode"`     // 종목코드
	MarketType  string `json:"marketType"`      // 시장 구분
	현재가         string `json:"현재가"`             // 현재가
	전일대비_상태     string `json:"전일대비_상태"`         // 전일 대비 상태 (상승/하락/보합)
	전일대비_가격     string `json:"전일대비_가격"`         // 전일 대비 가격 변화량
	전일대비_퍼센트    string `json:"전일대비_퍼센트"`        // 전일 대비 퍼센트 변화
	전일가         string `json:"전일가"`             // 전일 종가
	고가          string `json:"고가"`              // 고가
	저가          string `json:"저가"`              // 저가
	시가          string `json:"시가"`              // 시가
	거래량         string `json:"거래량"`             // 거래량
	거래대금        string `json:"거래대금"`            // 거래대금
	Time        string `json:"time"`            // 조회 시각
	Error       string `json:"error,omitempty"` // 에러 메시지 (있을 경우)
}

// 구조체 정의
type JsonInfo struct {
	Company string `json:"company"`
	Code    string `json:"code"`
}

// 종목 코드 매핑
var AREA_CODES = map[string]string{
	"삼성전자":     "005930",
	"포스코퓨처엠":   "003670",
	"LG에너지솔루션": "373220",
}

var (
	token  = "" // 텔레그램 봇 토큰
	chatID = "" // 텔레그램 Chat ID
)

func loadFile(filename string) (map[string]string, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	result := make(map[string]string)
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		var info JsonInfo
		line := scanner.Text()
		if err := json.Unmarshal([]byte(line), &info); err != nil {
			return nil, err
		}
		result[info.Company] = info.Code
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// 문자열 내 불필요한 공백과 줄바꿈 제거
func clean(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

// CSS 선택자에서 텍스트를 추출하는 JS 스니펫 생성
func getText(sel string) string {
	return `(() => {
		const el = document.querySelector("` + sel + `");
		return el ? el.textContent.trim() : '';
	})()`
}

// CSS 선택자에서 특정 속성 값을 추출하는 JS 스니펫 생성
func getAttr(sel, attr string) string {
	return `(() => {
		const el = document.querySelector("` + sel + `");
		return el ? el.getAttribute("` + attr + `") : '';
	})()`
}

// 크롤링
func getStock(ctx context.Context, stockname, stockcode string) StockInfo {

	url := fmt.Sprintf("https://finance.naver.com/item/main.nhn?code=%s", stockcode)

	// 주식 정보 저장 변수 선언
	var (
		companyName, companyCode, marketType string
		현재가, 상태, 가격, 퍼센트                     string
		전일가, 고가, 저가, 시가, 거래량, 거래대금           string
	)

	// 크롬DP 작업(Task) 정의
	tasks := chromedp.Tasks{
		chromedp.Navigate(url), // URL 접속
		chromedp.WaitVisible(".wrap_company h2 a", chromedp.ByQuery), // 회사명 요소가 로드될 때까지 대기

		// 회사 정보 추출
		chromedp.Evaluate(getText(".wrap_company h2 a"), &companyName),
		chromedp.Evaluate(getText(".wrap_company .code"), &companyCode),
		chromedp.Evaluate(getAttr(".wrap_company img", "alt"), &marketType),

		// 현재가 및 전일 대비 정보 추출
		chromedp.Evaluate(getText("#rate_info_krx .today .no_today em"), &현재가),
		chromedp.Evaluate(getText("#rate_info_krx .no_exday em span.ico"), &상태),
		chromedp.Evaluate(getText("#rate_info_krx .no_exday em:nth-of-type(1)"), &가격),
		chromedp.Evaluate(getText("#rate_info_krx .no_exday em:nth-of-type(2)"), &퍼센트),

		// 전일가, 고가, 저가, 시가, 거래량, 거래대금 추출
		chromedp.Evaluate(getText(".no_info tr:nth-child(1) td:nth-child(1) em"), &전일가),
		chromedp.Evaluate(getText(".no_info tr:nth-child(1) td:nth-child(2) em.no_up"), &고가),
		chromedp.Evaluate(getText(".no_info tr:nth-child(2) td:nth-child(2) em.no_down"), &저가),
		chromedp.Evaluate(getText(".no_info tr:nth-child(2) td:nth-child(1) em"), &시가),
		chromedp.Evaluate(getText(".no_info tr:nth-child(1) td:nth-child(3) em"), &거래량),
		chromedp.Evaluate(getText(".no_info tr:nth-child(2) td:nth-child(3) em"), &거래대금),
	}

	// 작업 실행
	err := chromedp.Run(ctx, tasks)

	// 수집한 데이터를 구조체에 저장하며 불필요한 공백 제거
	stock := StockInfo{
		Name:        stockname,
		CompanyName: clean(companyName),
		CompanyCode: clean(companyCode),
		MarketType:  clean(marketType),
		현재가:         clean(현재가),
		전일대비_상태:     clean(상태),
		전일대비_가격:     clean(가격),
		전일대비_퍼센트:    clean(퍼센트),
		전일가:         clean(전일가),
		고가:          clean(고가),
		저가:          clean(저가),
		시가:          clean(시가),
		거래량:         clean(거래량),
		거래대금:        clean(거래대금) + "백만",
		Time:        time.Now().Format("2006-01-02 15:04:05"),
	}

	if err != nil {
		log.Printf("[오류] %s 크롤링 실패: %v\n", stockname, err)
		stock.Error = err.Error()
	}

	return stock
}

// 전체 실행
func runTask(ctx context.Context) {

	/*
		areaCodes, err := loadFile("stocks.json")
		if err != nil {
			fmt.Println("Error:", err)
			return
		}

		var results []StockInfo
		for name, code := range areaCodes {
			stock := getStock(ctx, name, code)
			results = append(results, stock)
			printResult(stock)
		}

		// HTML 파일 저장
		saveHtml(results)
	*/

	var results []StockInfo
	for name, code := range AREA_CODES {
		stock := getStock(ctx, name, code)
		results = append(results, stock)
		printResult(stock)
	}

	// Telegram 전송
	if err := sendTelegram(results); err != nil {
		fmt.Println("오류:", err)
	}

	// HTML 파일 저장
	saveHtml(results)

}

// 조회 결과 출력
func printResult(stock StockInfo) {

	if stock.Error != "" {
		fmt.Printf("%s: 오류 발생 - %s\n", stock.Name, stock.Error)
		return
	}
	fmt.Printf("[%s] %s (%s)\n", stock.Name, stock.CompanyName, stock.CompanyCode)
	fmt.Printf("시장 구분: %s\n", stock.MarketType)
	fmt.Printf("현재가: %s\n", stock.현재가)
	fmt.Printf("전일대비: %s %s (%s)\n", stock.전일대비_상태, stock.전일대비_가격, stock.전일대비_퍼센트)
	fmt.Printf("전일가: %s, 고가: %s, 저가: %s\n", stock.전일가, stock.고가, stock.저가)
	fmt.Printf("시가: %s, 거래량: %s, 거래대금: %s\n", stock.시가, stock.거래량, stock.거래대금)
	fmt.Printf("조회시각: %s\n", stock.Time)
	fmt.Println("------------------------------")
}

// 결과를 HTML 파일로 저장
func saveHtml(results []StockInfo) {
	html := `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>주식 정보</title>
  <style>
    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #fafafa; }
  </style>
</head>
<body>
  <h2>네이버 주식 정보</h2>
  <table>
    <thead>
      <tr>
        <th>관심 이름</th>
        <th>회사명</th>
        <th>종목코드</th>
        <th>시장</th>
        <th>현재가</th>
        <th>전일대비</th>
        <th>전일가</th>
        <th>고가</th>
        <th>저가</th>
        <th>시가</th>
        <th>거래량</th>
        <th>거래대금</th>
        <th>조회시각</th>
      </tr>
    </thead>
    <tbody>`

	// 결과마다 테이블 행 추가
	for _, s := range results {
		if s.Error != "" {
			html += fmt.Sprintf(
				`<tr><td colspan="13" style="color:red;"><b>%s</b>: 오류 - %s</td></tr>`,
				s.Name, s.Error)
		} else {
			html += fmt.Sprintf(
				`<tr>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s %s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
				</tr>`,
				s.Name,
				s.CompanyName,
				s.CompanyCode,
				s.MarketType,
				s.현재가,
				s.전일대비_상태, s.전일대비_가격,
				s.전일가,
				s.고가,
				s.저가,
				s.시가,
				s.거래량,
				s.거래대금,
				s.Time,
			)
		}
	}

	html += `
    </tbody>
  </table>
</body>
</html>`

	// HTML 파일 저장
	err := os.WriteFile("stock_result.html", []byte(html), 0644)
	if err != nil {
		log.Println("HTML 저장 실패:", err)
	} else {
		fmt.Println("\nstock_result.html 파일이 생성되었습니다.")
	}
}

func main() {

	fmt.Println("[수동 실행] 주식 조회 시작...")

	// 크롬DP용 context 생성
	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	// 수동 실행
	runTask(ctx)

	// 30분마다 자동 실행할 크론 스케줄러 설정
	c := cron.New()
	_, err := c.AddFunc("*/30 * * * *", func() {
		fmt.Println("[자동 실행] 주식 조회 시작...")
		runTask(ctx)
	})
	if err != nil {
		log.Fatalf("크론 작업 추가 실패: %v", err)
	}
	c.Start()

	// 메인 함수 종료 방지
	select {}
}

// 마크다운 V2 형식에 맞게 특수 문자 이스케이프
func escapeMarkdownV2(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"[", "\\[",
		"]", "\\]",
		"(", "\\(",
		")", "\\)",
		"~", "\\~",
		"`", "\\`",
		">", "\\>",
		"#", "\\#",
		"+", "\\+",
		"-", "\\-",
		"=", "\\=",
		"|", "\\|",
		"{", "\\{",
		"}", "\\}",
		".", "\\.",
		"!", "\\!",
		"\\", "\\\\", // 백슬래시는 먼저 이스케이프
	)
	return replacer.Replace(text)
}

func sendTelegram(results []StockInfo) error {

	var sb strings.Builder
	sb.WriteString("📊 *주식 정보 업데이트*\n\n")

	for _, w := range results {
		if w.Error != "" {
			sb.WriteString(fmt.Sprintf("*%s*: 오류 \\- %s\n\n",
				escapeMarkdownV2(w.Name),
				escapeMarkdownV2(w.Error)))
		} else {
			statusEmoji := "➖"
			if strings.Contains(w.전일대비_상태, "상승") {
				statusEmoji = "🔺"
			} else if strings.Contains(w.전일대비_상태, "하락") {
				statusEmoji = "🔽"
			}

			sb.WriteString(fmt.Sprintf("*%s* `%s`\n",
				escapeMarkdownV2(w.Name),
				escapeMarkdownV2(w.CompanyCode)))

			sb.WriteString(fmt.Sprintf("현재가: `%s`원\n",
				escapeMarkdownV2(w.현재가)))

			sb.WriteString(fmt.Sprintf("전일대비: %s  `%s` `%s`\n",
				statusEmoji,
				escapeMarkdownV2(w.전일대비_가격),
				escapeMarkdownV2(w.전일대비_퍼센트)))

			sb.WriteString(fmt.Sprintf("시가: `%s`    고가: `%s`    저가: `%s`\n",
				escapeMarkdownV2(w.시가),
				escapeMarkdownV2(w.고가),
				escapeMarkdownV2(w.저가)))

			sb.WriteString(fmt.Sprintf("거래량: `%s`   거래대금: `%s`\n",
				escapeMarkdownV2(w.거래량),
				escapeMarkdownV2(w.거래대금)))

			sb.WriteString(fmt.Sprintf("`%s`\n",
				escapeMarkdownV2(w.Time)))

			sb.WriteString("\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\\-\n\n")
		}
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)

	payload := map[string]interface{}{
		"chat_id":                  chatID,
		"text":                     sb.String(),
		"parse_mode":               "MarkdownV2",
		"disable_web_page_preview": true,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("JSON 마샬링 오류: %v", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("HTTP 요청 오류: %v", err)
	}
	defer resp.Body.Close()

	// 응답 본문 읽기 (디버깅용)
	respBody := make([]byte, 1024)
	n, _ := resp.Body.Read(respBody)

	if resp.StatusCode != 200 {
		return fmt.Errorf("Telegram 전송 실패: HTTP %d, 응답: %s",
			resp.StatusCode, string(respBody[:n]))
	}

	fmt.Println("Telegram 메시지 전송 완료")
	return nil
}
