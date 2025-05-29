exports.generateHtml = (results) => {
  const rows = results.map(r => `
    <tr>
      <td>${r.area}</td>
      <td>${r.temperature || '-'}</td>
      <td>${r.condition || '-'}</td>
      <td>${r.rainChance || '-'}</td>
      <td>${r.feelsLike || '-'}</td>
      <td>${r.humidity ? r.humidity + '%' : '-'}</td>
      <td>${r.time || '-'}</td>
    </tr>
  `).join('');

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>날씨 정보</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
        th { background-color: #f8f8f8; }
      </style>
    </head>
    <body>
      <h2>네이버 날씨 정보</h2>
      <table>
        <thead>
          <tr>
            <th>지역</th>
            <th>현재 온도</th>
            <th>날씨</th>
            <th>강수확률</th>
            <th>체감 온도</th>
            <th>습도</th>
            <th>시간</th>
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

