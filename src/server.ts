import express from 'express';
import * as path from 'path';

import {
  generate18thPeriodEntries,
  generate17thPeriodEntries,
  generate18thBudget,
  generateStaffAllocation1Q,
  generateStaffAllocation2Q,
  DEPARTMENT_NAMES,
  DEPARTMENT_CODES,
} from './sample-data';

import {
  generateQuarterlyReport,
  generatePeriodReport,
  generateAnnualForecastChart,
} from './reports/quarterly-budget-actual';
import { generateManagementAccountingReport } from './reports/management-accounting';
import { generateIncomeStatement } from './reports/income-statement';
import { generateBalanceSheet } from './reports/balance-sheet';
import { generateCashFlowStatement } from './reports/cashflow';
import { calculateFinancialRatios } from './reports/ratio-analysis';
import { generateMonthlyTrend } from './reports/monthly-trend';
import { generateManagementExcel } from './output/excel-management';
import { generateExcelReport } from './output/excel';
import { Quarter } from './types/management-report';

import * as fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// プロキシ環境対応
app.set('trust proxy', true);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// データキャッシュ
const currentEntries = generate18thPeriodEntries();
const previousEntries = generate17thPeriodEntries();
const budget = generate18thBudget();

// ── API: 四半期予実レポート ──
app.get('/api/quarterly/:quarter', (req, res) => {
  const quarter = req.params.quarter as Quarter;
  if (!['1Q', '2Q', '3Q', '4Q'].includes(quarter)) {
    return res.status(400).json({ error: 'Invalid quarter' });
  }

  const report = generateQuarterlyReport(
    currentEntries, budget, quarter,
    DEPARTMENT_NAMES, DEPARTMENT_CODES, '18期'
  );
  res.json(report);
});

// ── API: 上半期予実レポート ──
app.get('/api/half-year', (_req, res) => {
  const report = generatePeriodReport(
    currentEntries, previousEntries, budget,
    ['1Q', '2Q'], DEPARTMENT_NAMES, DEPARTMENT_CODES,
    '18期上半期予実'
  );
  res.json(report);
});

// ── API: 通期見通しレポート ──
app.get('/api/annual', (_req, res) => {
  const report = generatePeriodReport(
    currentEntries, previousEntries, budget,
    ['1Q', '2Q', '3Q', '4Q'], DEPARTMENT_NAMES, DEPARTMENT_CODES,
    '18期通期見通し'
  );
  res.json(report);
});

// ── API: 通期見通しグラフデータ ──
app.get('/api/forecast-chart', (_req, res) => {
  const chart = generateAnnualForecastChart(currentEntries, budget, 2);
  res.json(chart);
});

// ── API: 管理会計レポート ──
app.get('/api/management-accounting/:quarter', (req, res) => {
  const quarter = req.params.quarter as Quarter;
  const allocation = quarter === '1Q' ? generateStaffAllocation1Q() : generateStaffAllocation2Q();

  const report = generateManagementAccountingReport(
    currentEntries, previousEntries, allocation,
    '2025-10', '2024-10', '18期', DEPARTMENT_NAMES
  );
  res.json(report);
});

// ── API: 財務3表 ──
app.get('/api/financial-statements', (_req, res) => {
  const pl = generateIncomeStatement(currentEntries, '2025-10-01', '2026-09-30');
  const bs = generateBalanceSheet(currentEntries, '2026-09-30');
  const cf = generateCashFlowStatement(currentEntries, '2025-10-01', '2026-09-30', pl);
  const ratios = calculateFinancialRatios(bs, pl, '2026-09');
  const trend = generateMonthlyTrend(currentEntries, '2025-10', '2026-09');

  res.json({ pl, bs, cf, ratios, trend });
});

// ── API: Excel ダウンロード ──
app.get('/api/download/management/:quarter', async (req, res) => {
  const quarter = req.params.quarter as Quarter;
  const allocation = quarter === '1Q' ? generateStaffAllocation1Q() : generateStaffAllocation2Q();

  const quarterlyReport = generateQuarterlyReport(
    currentEntries, budget, quarter,
    DEPARTMENT_NAMES, DEPARTMENT_CODES, '18期'
  );
  const halfYearReport = generatePeriodReport(
    currentEntries, previousEntries, budget,
    ['1Q', '2Q'], DEPARTMENT_NAMES, DEPARTMENT_CODES, '18期上半期予実'
  );
  const annualReport = generatePeriodReport(
    currentEntries, previousEntries, budget,
    ['1Q', '2Q', '3Q', '4Q'], DEPARTMENT_NAMES, DEPARTMENT_CODES, '18期通期見通し'
  );
  const forecastChart = generateAnnualForecastChart(currentEntries, budget, 2);
  const mgmt = generateManagementAccountingReport(
    currentEntries, previousEntries, allocation,
    '2025-10', '2024-10', '18期', DEPARTMENT_NAMES
  );

  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `18期_経営資料_${quarter}.xlsx`);

  await generateManagementExcel(filePath, '', {
    quarterlyReport, halfYearReport, annualReport, forecastChart,
    managementAccounting: mgmt,
  });

  res.download(filePath);
});

app.get('/api/download/financial', async (_req, res) => {
  const pl = generateIncomeStatement(currentEntries, '2025-10-01', '2026-09-30');
  const bs = generateBalanceSheet(currentEntries, '2026-09-30');
  const cf = generateCashFlowStatement(currentEntries, '2025-10-01', '2026-09-30', pl);
  const ratios = calculateFinancialRatios(bs, pl, '2026-09');
  const trend = generateMonthlyTrend(currentEntries, '2025-10', '2026-09');

  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, '18期_財務諸表.xlsx');

  await generateExcelReport(filePath, '', { bs, pl, cf, ratios, trend });
  res.download(filePath);
});

// SPA fallback (Express 5 requires named param for catch-all)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 財務経営資料ツール起動中: http://0.0.0.0:${PORT}\n`);
});
