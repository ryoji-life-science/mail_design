import ExcelJS from 'exceljs';
import * as path from 'path';
import {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  FinancialRatios,
  MonthlyTrend,
  BudgetActualComparison,
  DepartmentPL,
} from '../types';
import { formatCurrency, formatPercent } from '../utils/date';
import { RATIO_LABELS } from '../reports/ratio-analysis';

// スタイル定数
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FFFFFFFF' },
  bold: true,
  size: 11,
};
const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD6E4F0' },
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFB4C6E7' },
};
const CURRENCY_FORMAT = '#,##0';
const PERCENT_FORMAT = '0.0%';

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.fill = HEADER_FILL;
  row.font = HEADER_FONT;
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  row.height = 24;
}

function applyCurrencyFormat(cell: ExcelJS.Cell): void {
  cell.numFmt = CURRENCY_FORMAT;
  cell.alignment = { horizontal: 'right' };
}

function applyBorder(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number): void {
  const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFB0B0B0' } };
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }
}

/**
 * 全レポートを1つのExcelファイルに出力
 */
export async function generateExcelReport(
  outputPath: string,
  companyName: string,
  data: {
    bs?: BalanceSheet;
    pl?: IncomeStatement;
    cf?: CashFlowStatement;
    ratios?: FinancialRatios;
    trend?: MonthlyTrend;
    budgetActual?: BudgetActualComparison;
    departmentPLs?: DepartmentPL[];
  }
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '財務経営資料自動作成ツール';
  workbook.created = new Date();

  if (data.bs) {
    addBalanceSheetSheet(workbook, companyName, data.bs);
  }
  if (data.pl) {
    addIncomeStatementSheet(workbook, companyName, data.pl);
  }
  if (data.cf) {
    addCashFlowSheet(workbook, companyName, data.cf);
  }
  if (data.ratios) {
    addRatioSheet(workbook, companyName, data.ratios);
  }
  if (data.trend) {
    addTrendSheet(workbook, companyName, data.trend);
  }
  if (data.budgetActual) {
    addBudgetActualSheet(workbook, companyName, data.budgetActual);
  }
  if (data.departmentPLs && data.departmentPLs.length > 0) {
    addDepartmentPLSheet(workbook, companyName, data.departmentPLs);
  }

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

// ── 貸借対照表シート ──
function addBalanceSheetSheet(wb: ExcelJS.Workbook, companyName: string, bs: BalanceSheet): void {
  const ws = wb.addWorksheet('貸借対照表');
  ws.columns = [
    { width: 6 },
    { width: 25 },
    { width: 18 },
    { width: 6 },
    { width: 25 },
    { width: 18 },
  ];

  // タイトル
  ws.mergeCells('A1:F1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${companyName}　貸借対照表`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `${bs.date} 現在`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { size: 10 };

  // ヘッダー
  const headerRow = ws.getRow(4);
  headerRow.values = ['', '資産の部', '金額', '', '負債・純資産の部', '金額'];
  applyHeaderStyle(headerRow);

  // 資産の部（左側）
  let leftRow = 5;
  for (const item of bs.assets.items) {
    const row = ws.getRow(leftRow);
    if (item.isSubtotal) {
      row.values = ['', item.accountName, item.amount];
      row.font = { bold: true };
      row.getCell(3).fill = SUBTOTAL_FILL;
    } else {
      row.values = ['', `　${item.accountName}`, item.amount];
    }
    applyCurrencyFormat(row.getCell(3));
    leftRow++;
  }
  // 資産合計
  const assetTotalRow = ws.getRow(leftRow);
  assetTotalRow.values = ['', '資産合計', bs.assets.total];
  assetTotalRow.font = { bold: true };
  assetTotalRow.getCell(3).fill = TOTAL_FILL;
  applyCurrencyFormat(assetTotalRow.getCell(3));

  // 負債の部（右側）
  let rightRow = 5;
  for (const item of bs.liabilities.items) {
    const row = ws.getRow(rightRow);
    if (item.isSubtotal) {
      row.getCell(5).value = item.accountName;
      row.getCell(6).value = item.amount;
      row.getCell(5).font = { bold: true };
      row.getCell(6).fill = SUBTOTAL_FILL;
    } else {
      row.getCell(5).value = `　${item.accountName}`;
      row.getCell(6).value = item.amount;
    }
    applyCurrencyFormat(row.getCell(6));
    rightRow++;
  }

  // 負債合計
  const liabTotalRow = ws.getRow(rightRow);
  liabTotalRow.getCell(5).value = '負債合計';
  liabTotalRow.getCell(6).value = bs.liabilities.total;
  liabTotalRow.getCell(5).font = { bold: true };
  liabTotalRow.getCell(6).fill = SUBTOTAL_FILL;
  applyCurrencyFormat(liabTotalRow.getCell(6));
  rightRow++;

  // 純資産の部
  rightRow++;
  for (const item of bs.equity.items) {
    const row = ws.getRow(rightRow);
    row.getCell(5).value = `　${item.accountName}`;
    row.getCell(6).value = item.amount;
    applyCurrencyFormat(row.getCell(6));
    rightRow++;
  }
  const equityTotalRow = ws.getRow(rightRow);
  equityTotalRow.getCell(5).value = '純資産合計';
  equityTotalRow.getCell(6).value = bs.equity.total;
  equityTotalRow.getCell(5).font = { bold: true };
  equityTotalRow.getCell(6).fill = SUBTOTAL_FILL;
  applyCurrencyFormat(equityTotalRow.getCell(6));
  rightRow++;

  // 負債・純資産合計
  const totalRow = ws.getRow(rightRow);
  totalRow.getCell(5).value = '負債・純資産合計';
  totalRow.getCell(6).value = bs.liabilities.total + bs.equity.total;
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(6).fill = TOTAL_FILL;
  applyCurrencyFormat(totalRow.getCell(6));

  const maxRow = Math.max(leftRow, rightRow);
  applyBorder(ws, 4, maxRow, 1, 6);
}

// ── 損益計算書シート ──
function addIncomeStatementSheet(wb: ExcelJS.Workbook, companyName: string, pl: IncomeStatement): void {
  const ws = wb.addWorksheet('損益計算書');
  ws.columns = [{ width: 6 }, { width: 30 }, { width: 18 }, { width: 18 }];

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = `${companyName}　損益計算書`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `${pl.periodStart} 〜 ${pl.periodEnd}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  const headerRow = ws.getRow(4);
  headerRow.values = ['', '科目', '金額', ''];
  applyHeaderStyle(headerRow);

  let row = 5;

  const addSection = (group: { label: string; items: { accountName: string; amount: number }[]; total: number }, label?: string) => {
    const sectionRow = ws.getRow(row);
    sectionRow.values = ['', label ?? group.label, ''];
    sectionRow.font = { bold: true };
    row++;

    for (const item of group.items) {
      const r = ws.getRow(row);
      r.values = ['', `　${item.accountName}`, item.amount];
      applyCurrencyFormat(r.getCell(3));
      row++;
    }
    return group.total;
  };

  const addTotal = (label: string, amount: number, isMajor: boolean = false) => {
    const r = ws.getRow(row);
    r.values = ['', label, '', amount];
    r.font = { bold: true };
    r.getCell(4).fill = isMajor ? TOTAL_FILL : SUBTOTAL_FILL;
    applyCurrencyFormat(r.getCell(4));
    row++;
  };

  addSection(pl.revenue);
  addSection(pl.costOfSales);
  addTotal('売上総利益', pl.grossProfit);

  addSection(pl.sgaExpenses);
  addTotal('営業利益', pl.operatingIncome, true);

  if (pl.nonOperatingIncome.items.length > 0) addSection(pl.nonOperatingIncome);
  if (pl.nonOperatingExpense.items.length > 0) addSection(pl.nonOperatingExpense);
  addTotal('経常利益', pl.ordinaryIncome, true);

  if (pl.extraordinaryIncome.items.length > 0) addSection(pl.extraordinaryIncome);
  if (pl.extraordinaryExpense.items.length > 0) addSection(pl.extraordinaryExpense);
  addTotal('税引前当期純利益', pl.incomeBeforeTax);

  if (pl.tax.items.length > 0) addSection(pl.tax);
  addTotal('当期純利益', pl.netIncome, true);

  applyBorder(ws, 4, row - 1, 1, 4);
}

// ── キャッシュフロー計算書シート ──
function addCashFlowSheet(wb: ExcelJS.Workbook, companyName: string, cf: CashFlowStatement): void {
  const ws = wb.addWorksheet('CF計算書');
  ws.columns = [{ width: 6 }, { width: 35 }, { width: 18 }];

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = `${companyName}　キャッシュフロー計算書`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:C2');
  ws.getCell('A2').value = `${cf.periodStart} 〜 ${cf.periodEnd}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  let row = 4;

  const addCFSection = (section: { label: string; items: { label: string; amount: number }[]; total: number }) => {
    const headerR = ws.getRow(row);
    headerR.values = ['', section.label, ''];
    applyHeaderStyle(headerR);
    row++;

    for (const item of section.items) {
      const r = ws.getRow(row);
      r.values = ['', `　${item.label}`, item.amount];
      applyCurrencyFormat(r.getCell(3));
      row++;
    }

    const totalR = ws.getRow(row);
    totalR.values = ['', `${section.label} 合計`, section.total];
    totalR.font = { bold: true };
    totalR.getCell(3).fill = SUBTOTAL_FILL;
    applyCurrencyFormat(totalR.getCell(3));
    row++;
    row++;
  };

  addCFSection(cf.operating);
  addCFSection(cf.investing);
  addCFSection(cf.financing);

  // 現金増減
  const changeRow = ws.getRow(row);
  changeRow.values = ['', '現金及び現金同等物の増減額', cf.netChange];
  changeRow.font = { bold: true };
  changeRow.getCell(3).fill = TOTAL_FILL;
  applyCurrencyFormat(changeRow.getCell(3));
  row++;

  const beginRow = ws.getRow(row);
  beginRow.values = ['', '現金及び現金同等物の期首残高', cf.beginningCash];
  applyCurrencyFormat(beginRow.getCell(3));
  row++;

  const endRow = ws.getRow(row);
  endRow.values = ['', '現金及び現金同等物の期末残高', cf.endingCash];
  endRow.font = { bold: true };
  endRow.getCell(3).fill = TOTAL_FILL;
  applyCurrencyFormat(endRow.getCell(3));
}

// ── 財務比率分析シート ──
function addRatioSheet(wb: ExcelJS.Workbook, companyName: string, ratios: FinancialRatios): void {
  const ws = wb.addWorksheet('財務比率分析');
  ws.columns = [{ width: 6 }, { width: 28 }, { width: 15 }, { width: 40 }];

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = `${companyName}　財務比率分析`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = ratios.yearMonth;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  const headerRow = ws.getRow(4);
  headerRow.values = ['', '指標', '数値', '説明'];
  applyHeaderStyle(headerRow);

  let row = 5;
  const ratioEntries = Object.entries(RATIO_LABELS);

  for (const [key, meta] of ratioEntries) {
    const value = (ratios as unknown as Record<string, number>)[key];
    const r = ws.getRow(row);

    if (meta.unit === '%') {
      r.values = ['', meta.label, value, meta.description];
      r.getCell(3).numFmt = PERCENT_FORMAT;
    } else {
      r.values = ['', meta.label, value, meta.description];
      r.getCell(3).numFmt = '0.00';
    }
    r.getCell(3).alignment = { horizontal: 'right' };
    row++;
  }

  applyBorder(ws, 4, row - 1, 1, 4);
}

// ── 月次推移シート ──
function addTrendSheet(wb: ExcelJS.Workbook, companyName: string, trend: MonthlyTrend): void {
  const ws = wb.addWorksheet('月次推移');

  // カラム設定
  const cols: Partial<ExcelJS.Column>[] = [{ width: 6 }, { width: 15 }];
  for (const _month of trend.months) {
    cols.push({ width: 14 });
  }
  ws.columns = cols;

  ws.mergeCells(1, 1, 1, trend.months.length + 2);
  ws.getCell('A1').value = `${companyName}　月次推移表`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  // ヘッダー
  const headerRow = ws.getRow(3);
  const headerValues: (string | number)[] = ['', '科目'];
  for (const month of trend.months) {
    headerValues.push(month);
  }
  headerRow.values = headerValues;
  applyHeaderStyle(headerRow);

  // データ行
  let row = 4;
  for (const series of trend.series) {
    const r = ws.getRow(row);
    const values: (string | number)[] = ['', series.label];
    for (const v of series.values) {
      values.push(v);
    }
    r.values = values;

    // 金額フォーマット
    for (let c = 3; c <= trend.months.length + 2; c++) {
      applyCurrencyFormat(r.getCell(c));
    }

    // 利益行はボールド
    if (series.label.includes('利益')) {
      r.font = { bold: true };
    }

    row++;
  }

  applyBorder(ws, 3, row - 1, 1, trend.months.length + 2);
}

// ── 予実対比シート ──
function addBudgetActualSheet(wb: ExcelJS.Workbook, companyName: string, ba: BudgetActualComparison): void {
  const ws = wb.addWorksheet('予実対比');
  ws.columns = [
    { width: 6 },
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `${companyName}　予実対比表`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = ba.yearMonth;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  const headerRow = ws.getRow(4);
  headerRow.values = ['', '科目', '予算', '実績', '差異', '達成率'];
  applyHeaderStyle(headerRow);

  let row = 5;
  for (const item of ba.items) {
    const r = ws.getRow(row);
    r.values = [
      '',
      item.departmentName ? `${item.accountName}（${item.departmentName}）` : item.accountName,
      item.budgetAmount,
      item.actualAmount,
      item.variance,
      item.budgetAmount !== 0 ? item.actualAmount / item.budgetAmount : 0,
    ];
    applyCurrencyFormat(r.getCell(3));
    applyCurrencyFormat(r.getCell(4));
    applyCurrencyFormat(r.getCell(5));
    r.getCell(6).numFmt = PERCENT_FORMAT;

    // 差異がマイナス（予算未達）の場合は赤字
    if (item.variance < 0) {
      r.getCell(5).font = { color: { argb: 'FFFF0000' } };
    }

    row++;
  }

  applyBorder(ws, 4, row - 1, 1, 6);
}

// ── 部門別損益シート ──
function addDepartmentPLSheet(wb: ExcelJS.Workbook, companyName: string, deptPLs: DepartmentPL[]): void {
  const ws = wb.addWorksheet('部門別損益');

  const cols: Partial<ExcelJS.Column>[] = [{ width: 6 }, { width: 20 }];
  for (const _dept of deptPLs) {
    cols.push({ width: 15 });
  }
  cols.push({ width: 15 }); // 合計列
  ws.columns = cols;

  ws.mergeCells(1, 1, 1, deptPLs.length + 3);
  ws.getCell('A1').value = `${companyName}　部門別損益`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells(2, 1, 2, deptPLs.length + 3);
  ws.getCell('A2').value = deptPLs[0]?.yearMonth ?? '';
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // ヘッダー
  const headerRow = ws.getRow(4);
  const headerValues: string[] = ['', '項目'];
  for (const dept of deptPLs) {
    headerValues.push(dept.departmentName);
  }
  headerValues.push('合計');
  headerRow.values = headerValues;
  applyHeaderStyle(headerRow);

  // 各行のデータ
  const rowLabels = [
    { key: 'revenue', label: '売上高' },
    { key: 'costOfSales', label: '売上原価' },
    { key: 'grossProfit', label: '売上総利益' },
    { key: 'directExpenses', label: '直接経費' },
    { key: 'allocatedExpenses', label: '配賦経費' },
    { key: 'departmentProfit', label: '部門利益' },
  ];

  let row = 5;
  for (const { key, label } of rowLabels) {
    const r = ws.getRow(row);
    const values: (string | number)[] = ['', label];
    let total = 0;

    for (const dept of deptPLs) {
      const value = dept[key as keyof DepartmentPL] as number;
      values.push(value);
      total += value;
    }
    values.push(total);
    r.values = values;

    for (let c = 3; c <= deptPLs.length + 3; c++) {
      applyCurrencyFormat(r.getCell(c));
    }

    if (label.includes('利益')) {
      r.font = { bold: true };
      for (let c = 3; c <= deptPLs.length + 3; c++) {
        r.getCell(c).fill = SUBTOTAL_FILL;
      }
    }

    row++;
  }

  applyBorder(ws, 4, row - 1, 1, deptPLs.length + 3);
}
