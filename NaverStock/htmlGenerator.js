exports.generateHtml = (results) => {
  const rows = results.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.companyName || '-'}</td>
      <td>${r.companyCode || '-'}</td>
      <td>${r.marketType || '-'}</td>
      <td>${r.현재가 || '-'}</td>
      <td>${r.전일대비_상태 || '-'} ${r.전일대비_가격 || '-'} (${r.전일대비_퍼센트 || '-'})</td>
      <td>${r.전일가 || '-'}</td>
      <td>${r.고가 || r.상한가 || '-'}</td>
      <td>${r.저가 || r.하한가 || '-'}</td>
      <td>${r.시가 || '-'}</td>
      <td>${r.거래량 || '-'}</td>
      <td>${r.거래대금 || '-'}</td>
      <td>${r.time || '-'}</td>
    </tr>
  `).join('');

  return `
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
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
};
