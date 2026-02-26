// ============================================================
// 財務経営資料 Web UI
// ============================================================

// ── ユーティリティ ──
function fmt(n) {
  if (n == null || isNaN(n)) return '-';
  return Math.round(n).toLocaleString('ja-JP');
}

function fmtNeg(n) {
  if (n == null || isNaN(n)) return '-';
  if (n < 0) return `(${Math.abs(Math.round(n)).toLocaleString('ja-JP')})`;
  return Math.round(n).toLocaleString('ja-JP');
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '-';
  return `${Math.round(n)}%`;
}

function fmtRatio(n) {
  if (n == null || isNaN(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// ── ページ切り替え ──
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + tab.dataset.page).classList.add('active');

    // 遅延ロード
    const page = tab.dataset.page;
    if (page === 'half-year' && !loaded.halfYear) loadHalfYear();
    if (page === 'annual' && !loaded.annual) loadAnnual();
    if (page === 'chart' && !loaded.chart) loadChart();
    if (page === 'mgmt' && !loaded.mgmt) loadMgmt('2Q');
    if (page === 'financial' && !loaded.financial) loadFinancial();
  });
});

const loaded = { quarterly: false, halfYear: false, annual: false, chart: false, mgmt: false, financial: false };

// ── Excel ダウンロード ──
function downloadExcel(type) {
  if (type === 'management') {
    window.location.href = '/api/download/management/1Q';
  } else {
    window.location.href = '/api/download/financial';
  }
}

// ================================================================
// 四半期予実
// ================================================================
async function loadQuarterly(quarter) {
  document.querySelectorAll('#page-quarterly .quarter-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === quarter);
  });

  const data = await fetchJSON(`/api/quarterly/${quarter}`);
  const badge = document.getElementById('q-badge');
  badge.textContent = quarter;

  document.getElementById('q-title').textContent = `${quarter}予実`;
  document.getElementById('q-comment').textContent = '◆' + data.title;

  const thead = document.querySelector('#q-table thead tr');
  thead.innerHTML = `
    <th></th>
    <th>${quarter}予算</th>
    <th>${quarter}実績</th>
    <th>予実差異</th>
    <th>増減%</th>
  `;

  const tbody = document.querySelector('#q-table tbody');
  tbody.innerHTML = '';

  const s = data.sections;
  const rows = [
    { data: s.revenue.total, cls: 'subtotal' },
    ...s.revenue.byDepartment.map(r => ({ data: r, indent: true })),
    { data: s.costOfSales },
    { data: s.grossMarginRate },
    { data: s.grossProfit, cls: 'subtotal' },
    { data: s.sgaExpenses },
    { data: s.operatingProfit, cls: 'total' },
    { data: s.operatingMarginRate },
    { data: s.ordinaryProfit, cls: 'total' },
  ];

  rows.forEach(({ data: r, cls, indent }) => {
    const tr = document.createElement('tr');
    if (cls) tr.className = cls;

    if (r.isRate) {
      tr.innerHTML = `
        <td class="label ${indent ? 'indent' : ''}">${r.label}</td>
        <td class="pct">${fmtPct(r.budget)}</td>
        <td class="pct">${fmtPct(r.actual)}</td>
        <td></td><td></td>
      `;
    } else {
      const varClass = r.variance < 0 ? 'negative' : '';
      const highlightClass = r.isHighlight && r.variance < 0 ? 'highlight-red' : '';
      tr.innerHTML = `
        <td class="label ${indent ? 'indent' : ''}">${r.label}</td>
        <td class="num">${fmt(r.budget)}</td>
        <td class="num">${fmt(r.actual)}</td>
        <td class="num ${varClass} ${highlightClass}">${fmtNeg(r.variance)}</td>
        <td class="pct ${highlightClass}">${fmtPct(r.varianceRate)}</td>
      `;
    }
    tbody.appendChild(tr);
  });

  loaded.quarterly = true;
}

// ================================================================
// 上半期予実
// ================================================================
async function loadHalfYear() {
  const data = await fetchJSON('/api/half-year');

  const commentsEl = document.getElementById('hy-comments');
  commentsEl.innerHTML = data.commentBullets
    .map(c => `<p class="report-comment">◆${c}</p>`).join('');

  const thead = document.querySelector('#hy-table thead tr');
  thead.innerHTML = `
    <th></th>
    <th>17期実績</th>
    <th>予算</th>
    <th>実績</th>
    <th>対前年比差</th>
    <th>対予算比差</th>
  `;

  renderPeriodTable('#hy-table tbody', data);
  loaded.halfYear = true;
}

// ================================================================
// 通期見通し
// ================================================================
async function loadAnnual() {
  const data = await fetchJSON('/api/annual');

  const commentsEl = document.getElementById('an-comments');
  commentsEl.innerHTML = data.commentBullets
    .map(c => `<p class="report-comment">◆${c}</p>`).join('');

  const thead = document.querySelector('#an-table thead tr');
  thead.innerHTML = `
    <th></th>
    <th>17期実績</th>
    <th>今期予算</th>
    <th>今期予測</th>
    <th>対予算比増減率</th>
  `;

  renderPeriodTable('#an-table tbody', data, true);
  loaded.annual = true;
}

function renderPeriodTable(selector, data, isAnnual) {
  const tbody = document.querySelector(selector);
  tbody.innerHTML = '';

  const s = data.sections;
  const rows = [
    { data: s.revenue.total, cls: 'subtotal' },
    ...s.revenue.byDepartment.map(r => ({ data: r, indent: true })),
    { data: s.costOfSales },
    { data: s.grossMarginRate },
    { data: s.grossProfit, cls: 'subtotal' },
    { data: s.sgaExpenses },
    { data: s.operatingProfit, cls: 'total' },
    { data: s.operatingMarginRate },
    { data: s.ordinaryProfit, cls: 'total' },
  ];

  rows.forEach(({ data: r, cls, indent }) => {
    const tr = document.createElement('tr');
    if (cls) tr.className = cls;

    if (r.isRate) {
      if (isAnnual) {
        tr.innerHTML = `
          <td class="label">${r.label}</td>
          <td class="pct">${fmtPct(r.previousYear)}</td>
          <td class="pct">${fmtPct(r.budget)}</td>
          <td class="pct">${fmtPct(r.actual)}</td>
          <td></td>
        `;
      } else {
        tr.innerHTML = `
          <td class="label">${r.label}</td>
          <td class="pct">${fmtPct(r.previousYear)}</td>
          <td class="pct">${fmtPct(r.budget)}</td>
          <td class="pct">${fmtPct(r.actual)}</td>
          <td></td><td></td>
        `;
      }
    } else {
      const budgetVarCls = (r.budgetVarianceRate || 0) < 0 ? 'negative' : '';
      const hlCls = r.isHighlight && (r.budgetVarianceRate || 0) < 0 ? 'highlight-red' : '';

      if (isAnnual) {
        tr.innerHTML = `
          <td class="label ${indent ? 'indent' : ''}">${r.label}</td>
          <td class="num">${fmt(r.previousYear)}</td>
          <td class="num">${fmt(r.budget)}</td>
          <td class="num">${fmt(r.actual)}</td>
          <td class="pct ${budgetVarCls} ${hlCls}">${fmtPct(r.budgetVarianceRate)}</td>
        `;
      } else {
        const yoyVarCls = (r.yoyVariance || 0) < 0 ? 'negative' : '';
        tr.innerHTML = `
          <td class="label ${indent ? 'indent' : ''}">${r.label}</td>
          <td class="num">${fmt(r.previousYear)}</td>
          <td class="num">${fmt(r.budget)}</td>
          <td class="num">${fmt(r.actual)}</td>
          <td class="num ${yoyVarCls}">${fmtNeg(r.yoyVariance)}</td>
          <td class="pct ${budgetVarCls} ${hlCls}">${fmtPct(r.budgetVarianceRate)}</td>
        `;
      }
    }
    tbody.appendChild(tr);
  });
}

// ================================================================
// 通期見通しグラフ
// ================================================================
async function loadChart() {
  const data = await fetchJSON('/api/forecast-chart');

  document.getElementById('chart-title').textContent = data.title;
  document.getElementById('chart-subtitle').textContent = data.subtitle;

  // データテーブル
  const thead = document.querySelector('#chart-data-table thead tr');
  thead.innerHTML = '<th></th>' + data.quarters.map(q => `<th>${q}</th>`).join('');

  const tbody = document.querySelector('#chart-data-table tbody');
  tbody.innerHTML = '';

  const budgetRow = document.createElement('tr');
  budgetRow.innerHTML = '<td class="label">予算（累計）</td>' +
    data.budgetCumulative.map(v => `<td class="num">${fmt(v)}</td>`).join('');
  tbody.appendChild(budgetRow);

  const actualRow = document.createElement('tr');
  actualRow.innerHTML = '<td class="label">実績/見込み（累計）</td>' +
    data.actualCumulative.map((v, i) =>
      `<td class="num" style="${i >= data.actualQuarters ? 'font-style:italic;color:#999' : 'font-weight:bold'}">${fmt(v)}</td>`
    ).join('');
  tbody.appendChild(actualRow);

  // Canvas グラフ描画
  drawForecastChart(data);

  loaded.chart = true;
}

function drawForecastChart(data) {
  const canvas = document.getElementById('forecastChart');
  const ctx = canvas.getContext('2d');

  // Canvasサイズ
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.min(rect.width - 48, 800);
  canvas.height = 400;

  const w = canvas.width;
  const h = canvas.height;
  const pad = { top: 40, right: 40, bottom: 60, left: 100 };

  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  // データ範囲
  const allValues = [...data.budgetCumulative, ...data.actualCumulative];
  const maxVal = Math.max(...allValues) * 1.1;

  const xStep = chartW / 3;
  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + chartH - (v / maxVal) * chartH;

  // 背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // グリッド
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  const gridSteps = 6;
  for (let i = 0; i <= gridSteps; i++) {
    const y = pad.top + (chartH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    // Y軸ラベル
    const val = maxVal - (maxVal / gridSteps) * i;
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmt(Math.round(val)), pad.left - 10, y + 4);
  }

  // X軸ラベル
  ctx.fillStyle = '#333';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  data.quarters.forEach((q, i) => {
    ctx.fillText(q, toX(i), h - pad.bottom + 25);
  });

  // 予算線（青）
  ctx.strokeStyle = '#4472C4';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.budgetCumulative.forEach((v, i) => {
    if (i === 0) ctx.moveTo(toX(i), toY(v));
    else ctx.lineTo(toX(i), toY(v));
  });
  ctx.stroke();

  // 実績線（赤、実線）
  ctx.strokeStyle = '#E74C3C';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let i = 0; i < data.actualQuarters && i < data.actualCumulative.length; i++) {
    if (i === 0) ctx.moveTo(toX(i), toY(data.actualCumulative[i]));
    else ctx.lineTo(toX(i), toY(data.actualCumulative[i]));
  }
  ctx.stroke();

  // 見込み線（赤、点線）
  if (data.actualQuarters < data.actualCumulative.length) {
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(toX(data.actualQuarters - 1), toY(data.actualCumulative[data.actualQuarters - 1]));
    for (let i = data.actualQuarters; i < data.actualCumulative.length; i++) {
      ctx.lineTo(toX(i), toY(data.actualCumulative[i]));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // データ点
  [...data.budgetCumulative, ...data.actualCumulative].forEach((v, idx) => {
    const i = idx % 4;
    const isBudget = idx < 4;
    ctx.beginPath();
    ctx.arc(toX(i), toY(v), 4, 0, Math.PI * 2);
    ctx.fillStyle = isBudget ? '#4472C4' : '#E74C3C';
    ctx.fill();
  });
}

// ================================================================
// 管理会計
// ================================================================
async function loadMgmt(quarter) {
  document.querySelectorAll('#page-mgmt .quarter-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === quarter);
  });

  const data = await fetchJSON(`/api/management-accounting/${quarter}`);

  document.getElementById('mgmt-badge').textContent = quarter;
  document.getElementById('mgmt-title').textContent = data.title;
  document.getElementById('mgmt-subtitle').textContent = data.subtitle;

  // 部門別営業利益テーブル
  const pt = data.profitTable;
  const profitThead = document.querySelector('#mgmt-profit-table thead tr');
  profitThead.innerHTML = '<th>単位: 千円</th>' + pt.departments.map(d => `<th>${d}</th>`).join('');

  const profitTbody = document.querySelector('#mgmt-profit-table tbody');
  profitTbody.innerHTML = '';

  pt.rows.forEach(row => {
    const tr = document.createElement('tr');
    const isProfit = row.label.includes('利益');
    if (isProfit) tr.className = 'subtotal';

    tr.innerHTML = `<td class="label">${row.label}</td>` +
      row.values.map(v => {
        const cls = v < 0 ? 'num negative' : 'num';
        return `<td class="${cls}">${fmt(v)}</td>`;
      }).join('');

    profitTbody.appendChild(tr);
  });

  // 前期比率行
  if (pt.ratioRows) {
    pt.ratioRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 'rate-row';
      tr.style.background = '#f0f0f0';
      tr.innerHTML = `<td class="label" style="font-style:italic">${row.label}</td>` +
        row.values.map(v => `<td class="pct">${v}</td>`).join('');
      profitTbody.appendChild(tr);
    });
  }

  // 人件費配分テーブル
  const sat = data.staffAllocationTable;
  const allocThead = document.querySelector('#mgmt-alloc-table thead tr');
  allocThead.innerHTML = `<th>${sat.quarterLabel}</th>` +
    sat.departments.map(d => `<th>${d}</th>`).join('');

  const allocTbody = document.querySelector('#mgmt-alloc-table tbody');
  allocTbody.innerHTML = '';

  sat.staffMembers.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${name}</td>` +
      sat.allocations[i].map(pct => `<td>${pct}%</td>`).join('');
    allocTbody.appendChild(tr);
  });

  // コメント
  const commentsEl = document.getElementById('mgmt-comments');
  if (data.comments.length > 0) {
    commentsEl.innerHTML = data.comments.map(c =>
      `<p style="font-size:13px; margin:4px 0;">■${c}</p>`
    ).join('');
  }

  loaded.mgmt = true;
}

// ================================================================
// 財務諸表
// ================================================================
async function loadFinancial() {
  const data = await fetchJSON('/api/financial-statements');

  // P/L
  const plEl = document.getElementById('fs-pl');
  plEl.innerHTML = renderPL(data.pl);

  // B/S
  const bsEl = document.getElementById('fs-bs');
  bsEl.innerHTML = renderBS(data.bs);

  // C/F
  const cfEl = document.getElementById('fs-cf');
  cfEl.innerHTML = renderCF(data.cf);

  // 財務比率
  const ratiosEl = document.getElementById('fs-ratios');
  ratiosEl.innerHTML = renderRatios(data.ratios);

  // 月次推移
  renderTrend(data.trend);

  loaded.financial = true;
}

function renderPL(pl) {
  let html = `<table class="report-table" style="font-size:12px;">`;

  const section = (label, items) => {
    html += `<tr class="subtotal"><td class="label" colspan="2">${label}</td></tr>`;
    items.forEach(item => {
      html += `<tr><td class="indent">${item.accountName}</td><td class="num">${fmt(item.amount)}</td></tr>`;
    });
  };

  const total = (label, amount, cls) => {
    html += `<tr class="${cls || 'subtotal'}"><td class="label">${label}</td><td class="num">${fmt(amount)}</td></tr>`;
  };

  section('売上高', pl.revenue.items);
  section('売上原価', pl.costOfSales.items);
  total('売上総利益', pl.grossProfit);
  section('販売費及び一般管理費', pl.sgaExpenses.items);
  total('営業利益', pl.operatingIncome, 'total');
  if (pl.nonOperatingIncome.items.length) section('営業外収益', pl.nonOperatingIncome.items);
  if (pl.nonOperatingExpense.items.length) section('営業外費用', pl.nonOperatingExpense.items);
  total('経常利益', pl.ordinaryIncome, 'total');
  total('当期純利益', pl.netIncome, 'total');

  html += '</table>';
  return html;
}

function renderBS(bs) {
  let html = `<table class="report-table" style="font-size:12px;">`;

  const renderGroup = (label, items, total) => {
    html += `<tr class="subtotal"><td class="label" colspan="2">【${label}】</td></tr>`;
    items.forEach(item => {
      if (item.isSubtotal) {
        html += `<tr style="background:${item.isSubtotal ? '#D6E4F0' : ''}"><td class="label">${item.accountName}</td><td class="num">${fmt(item.amount)}</td></tr>`;
      } else {
        html += `<tr><td class="indent">${item.accountName}</td><td class="num">${fmt(item.amount)}</td></tr>`;
      }
    });
    html += `<tr class="total"><td class="label">${label}合計</td><td class="num">${fmt(total)}</td></tr>`;
  };

  renderGroup('資産の部', bs.assets.items, bs.assets.total);
  renderGroup('負債の部', bs.liabilities.items, bs.liabilities.total);
  renderGroup('純資産の部', bs.equity.items, bs.equity.total);

  html += '</table>';
  return html;
}

function renderCF(cf) {
  let html = `<table class="report-table" style="font-size:12px;">`;

  const section = (s) => {
    html += `<tr class="subtotal"><td class="label" colspan="2">${s.label}</td></tr>`;
    s.items.forEach(item => {
      html += `<tr><td class="indent">${item.label}</td><td class="num">${fmt(item.amount)}</td></tr>`;
    });
    html += `<tr style="background:#D6E4F0"><td class="label">小計</td><td class="num">${fmt(s.total)}</td></tr>`;
  };

  section(cf.operating);
  section(cf.investing);
  section(cf.financing);

  html += `<tr class="total"><td class="label">現金増減額</td><td class="num">${fmt(cf.netChange)}</td></tr>`;
  html += `<tr><td class="label">期首現金残高</td><td class="num">${fmt(cf.beginningCash)}</td></tr>`;
  html += `<tr class="total"><td class="label">期末現金残高</td><td class="num">${fmt(cf.endingCash)}</td></tr>`;
  html += '</table>';
  return html;
}

function renderRatios(ratios) {
  const labels = {
    grossProfitMargin: ['売上総利益率', '売上に対する粗利の割合'],
    operatingProfitMargin: ['営業利益率', '本業での収益力'],
    ordinaryProfitMargin: ['経常利益率', '経常的な収益力'],
    netProfitMargin: ['当期純利益率', '最終的な利益率'],
    roe: ['ROE', '自己資本利益率'],
    roa: ['ROA', '総資産利益率'],
    currentRatio: ['流動比率', '短期支払い能力（200%以上が理想）'],
    equityRatio: ['自己資本比率', '財務の安定性（40%以上が望ましい）'],
    debtEquityRatio: ['D/Eレシオ', '負債と自己資本の比率'],
    totalAssetTurnover: ['総資産回転率', '資産活用の効率性'],
    receivableTurnover: ['売上債権回転率', '債権回収の効率性'],
  };

  let html = '<table class="report-table ratio-table" style="font-size:12px;">';
  for (const [key, [label, desc]] of Object.entries(labels)) {
    const val = ratios[key];
    const formatted = key.includes('Ratio') || key.includes('Margin') || key === 'roe' || key === 'roa'
      ? fmtRatio(val)
      : val != null ? val.toFixed(2) + '回' : '-';
    html += `<tr><td>${label}</td><td>${formatted}</td><td>${desc}</td></tr>`;
  }
  html += '</table>';
  return html;
}

function renderTrend(trend) {
  const thead = document.querySelector('#fs-trend thead tr');
  thead.innerHTML = '<th>科目</th>' + trend.months.map(m => `<th>${m}</th>`).join('');

  const tbody = document.querySelector('#fs-trend tbody');
  tbody.innerHTML = '';

  trend.series.forEach(s => {
    const tr = document.createElement('tr');
    if (s.label.includes('利益')) tr.className = 'subtotal';
    tr.innerHTML = `<td class="label">${s.label}</td>` +
      s.values.map(v => `<td class="num">${fmt(v)}</td>`).join('');
    tbody.appendChild(tr);
  });
}

// ── 初期ロード ──
loadQuarterly('1Q');
