import PDFDocument from 'pdfkit';
import * as fs from 'fs';
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

const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADER = 10;
const FONT_SIZE_BODY = 9;
const MARGIN = 40;
const LINE_HEIGHT = 16;

/**
 * 全レポートを1つのPDFファイルに出力
 *
 * 注: 日本語フォントはシステムにインストールされている必要があります。
 * フォントが見つからない場合は英数字のみで出力されます。
 */
export async function generatePDFReport(
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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: false,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // 日本語フォントの読み込み試行
    let fontLoaded = false;
    const fontPaths = [
      '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
      '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
      'C:\\Windows\\Fonts\\msgothic.ttc',
    ];

    for (const fontPath of fontPaths) {
      if (fs.existsSync(fontPath)) {
        try {
          doc.registerFont('Japanese', fontPath);
          fontLoaded = true;
          break;
        } catch {
          // フォント読み込み失敗、次を試行
        }
      }
    }

    const setFont = () => {
      if (fontLoaded) {
        doc.font('Japanese');
      }
    };

    // ── 損益計算書 ──
    if (data.pl) {
      doc.addPage();
      setFont();
      renderPLPage(doc, companyName, data.pl, fontLoaded);
    }

    // ── 貸借対照表 ──
    if (data.bs) {
      doc.addPage();
      setFont();
      renderBSPage(doc, companyName, data.bs, fontLoaded);
    }

    // ── キャッシュフロー計算書 ──
    if (data.cf) {
      doc.addPage();
      setFont();
      renderCFPage(doc, companyName, data.cf, fontLoaded);
    }

    // ── 財務比率分析 ──
    if (data.ratios) {
      doc.addPage();
      setFont();
      renderRatiosPage(doc, companyName, data.ratios, fontLoaded);
    }

    // ── 予実対比 ──
    if (data.budgetActual) {
      doc.addPage();
      setFont();
      renderBudgetActualPage(doc, companyName, data.budgetActual, fontLoaded);
    }

    // ── 部門別損益 ──
    if (data.departmentPLs && data.departmentPLs.length > 0) {
      doc.addPage();
      setFont();
      renderDepartmentPLPage(doc, companyName, data.departmentPLs, fontLoaded);
    }

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

function drawTitle(doc: PDFKit.PDFDocument, title: string, subtitle: string): number {
  doc.fontSize(FONT_SIZE_TITLE).text(title, MARGIN, MARGIN, { align: 'center' });
  doc.fontSize(FONT_SIZE_BODY).text(subtitle, { align: 'center' });
  return MARGIN + 50;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number, headers: string[], colWidths: number[]): number {
  const pageWidth = doc.page.width - MARGIN * 2;

  // ヘッダー背景
  doc.rect(MARGIN, y, pageWidth, LINE_HEIGHT + 4)
    .fill('#1F4E79');

  let x = MARGIN + 4;
  doc.fillColor('#FFFFFF').fontSize(FONT_SIZE_HEADER);
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y + 3, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
    x += colWidths[i];
  }
  doc.fillColor('#000000');

  return y + LINE_HEIGHT + 4;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  values: string[],
  colWidths: number[],
  options?: { bold?: boolean; bgColor?: string }
): number {
  const pageWidth = doc.page.width - MARGIN * 2;

  if (options?.bgColor) {
    doc.rect(MARGIN, y, pageWidth, LINE_HEIGHT).fill(options.bgColor);
    doc.fillColor('#000000');
  }

  let x = MARGIN + 4;
  doc.fontSize(FONT_SIZE_BODY);
  for (let i = 0; i < values.length; i++) {
    doc.text(values[i], x, y + 2, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
    x += colWidths[i];
  }

  // 罫線
  doc.strokeColor('#B0B0B0').lineWidth(0.5);
  doc.moveTo(MARGIN, y + LINE_HEIGHT).lineTo(MARGIN + pageWidth, y + LINE_HEIGHT).stroke();

  return y + LINE_HEIGHT;
}

// ── P/Lページ描画 ──
function renderPLPage(doc: PDFKit.PDFDocument, companyName: string, pl: IncomeStatement, _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} 損益計算書`, `${pl.periodStart} 〜 ${pl.periodEnd}`);
  const colWidths = [300, 130];

  y = drawTableHeader(doc, y, ['科目', '金額'], colWidths);

  const addPLSection = (label: string, items: { accountName: string; amount: number }[], total: number) => {
    y = drawTableRow(doc, y, [label, ''], colWidths, { bold: true, bgColor: '#E8EEF4' });
    for (const item of items) {
      y = drawTableRow(doc, y, [`  ${item.accountName}`, formatCurrency(item.amount)], colWidths);
    }
  };

  const addPLTotal = (label: string, amount: number, major?: boolean) => {
    y = drawTableRow(doc, y, [label, formatCurrency(amount)], colWidths, {
      bold: true,
      bgColor: major ? '#B4C6E7' : '#D6E4F0',
    });
  };

  addPLSection('売上高', pl.revenue.items, pl.revenue.total);
  addPLSection('売上原価', pl.costOfSales.items, pl.costOfSales.total);
  addPLTotal('売上総利益', pl.grossProfit);
  addPLSection('販売費及び一般管理費', pl.sgaExpenses.items, pl.sgaExpenses.total);
  addPLTotal('営業利益', pl.operatingIncome, true);

  if (pl.nonOperatingIncome.items.length > 0) {
    addPLSection('営業外収益', pl.nonOperatingIncome.items, pl.nonOperatingIncome.total);
  }
  if (pl.nonOperatingExpense.items.length > 0) {
    addPLSection('営業外費用', pl.nonOperatingExpense.items, pl.nonOperatingExpense.total);
  }
  addPLTotal('経常利益', pl.ordinaryIncome, true);

  if (pl.tax.items.length > 0) {
    addPLSection('法人税等', pl.tax.items, pl.tax.total);
  }
  addPLTotal('当期純利益', pl.netIncome, true);
}

// ── B/Sページ描画 ──
function renderBSPage(doc: PDFKit.PDFDocument, companyName: string, bs: BalanceSheet, _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} 貸借対照表`, `${bs.date} 現在`);
  const colWidths = [300, 130];

  y = drawTableHeader(doc, y, ['科目', '金額'], colWidths);

  // 資産の部
  y = drawTableRow(doc, y, ['【資産の部】', ''], colWidths, { bold: true, bgColor: '#E8EEF4' });
  for (const item of bs.assets.items) {
    const bg = item.isSubtotal ? '#D6E4F0' : undefined;
    y = drawTableRow(doc, y, [item.isSubtotal ? item.accountName : `  ${item.accountName}`, formatCurrency(item.amount)], colWidths, { bgColor: bg });
  }
  y = drawTableRow(doc, y, ['資産合計', formatCurrency(bs.assets.total)], colWidths, { bold: true, bgColor: '#B4C6E7' });

  // 負債の部
  y = drawTableRow(doc, y, ['【負債の部】', ''], colWidths, { bold: true, bgColor: '#E8EEF4' });
  for (const item of bs.liabilities.items) {
    const bg = item.isSubtotal ? '#D6E4F0' : undefined;
    y = drawTableRow(doc, y, [item.isSubtotal ? item.accountName : `  ${item.accountName}`, formatCurrency(item.amount)], colWidths, { bgColor: bg });
  }
  y = drawTableRow(doc, y, ['負債合計', formatCurrency(bs.liabilities.total)], colWidths, { bold: true, bgColor: '#B4C6E7' });

  // 純資産の部
  y = drawTableRow(doc, y, ['【純資産の部】', ''], colWidths, { bold: true, bgColor: '#E8EEF4' });
  for (const item of bs.equity.items) {
    y = drawTableRow(doc, y, [`  ${item.accountName}`, formatCurrency(item.amount)], colWidths);
  }
  y = drawTableRow(doc, y, ['純資産合計', formatCurrency(bs.equity.total)], colWidths, { bold: true, bgColor: '#B4C6E7' });
  y = drawTableRow(doc, y, ['負債・純資産合計', formatCurrency(bs.liabilities.total + bs.equity.total)], colWidths, { bold: true, bgColor: '#B4C6E7' });
}

// ── C/Fページ描画 ──
function renderCFPage(doc: PDFKit.PDFDocument, companyName: string, cf: CashFlowStatement, _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} キャッシュフロー計算書`, `${cf.periodStart} 〜 ${cf.periodEnd}`);
  const colWidths = [340, 130];

  const renderSection = (section: { label: string; items: { label: string; amount: number }[]; total: number }) => {
    y = drawTableHeader(doc, y, [section.label, '金額'], colWidths);
    for (const item of section.items) {
      y = drawTableRow(doc, y, [`  ${item.label}`, formatCurrency(item.amount)], colWidths);
    }
    y = drawTableRow(doc, y, ['小計', formatCurrency(section.total)], colWidths, { bold: true, bgColor: '#D6E4F0' });
    y += 8;
  };

  renderSection(cf.operating);
  renderSection(cf.investing);
  renderSection(cf.financing);

  y = drawTableRow(doc, y, ['現金増減額', formatCurrency(cf.netChange)], colWidths, { bold: true, bgColor: '#B4C6E7' });
  y = drawTableRow(doc, y, ['期首現金残高', formatCurrency(cf.beginningCash)], colWidths);
  y = drawTableRow(doc, y, ['期末現金残高', formatCurrency(cf.endingCash)], colWidths, { bold: true, bgColor: '#B4C6E7' });
}

// ── 財務比率ページ描画 ──
function renderRatiosPage(doc: PDFKit.PDFDocument, companyName: string, ratios: FinancialRatios, _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} 財務比率分析`, ratios.yearMonth);
  const colWidths = [200, 80, 190];

  y = drawTableHeader(doc, y, ['指標', '数値', '説明'], colWidths);

  for (const [key, meta] of Object.entries(RATIO_LABELS)) {
    const value = (ratios as unknown as Record<string, number>)[key];
    const formatted = meta.unit === '%' ? formatPercent(value) : value.toFixed(2) + meta.unit;
    y = drawTableRow(doc, y, [meta.label, formatted, meta.description], colWidths);
  }
}

// ── 予実対比ページ描画 ──
function renderBudgetActualPage(doc: PDFKit.PDFDocument, companyName: string, ba: BudgetActualComparison, _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} 予実対比表`, ba.yearMonth);
  const colWidths = [160, 90, 90, 90, 70];

  y = drawTableHeader(doc, y, ['科目', '予算', '実績', '差異', '達成率'], colWidths);

  for (const item of ba.items) {
    const achieveRate = item.budgetAmount !== 0
      ? formatPercent(item.actualAmount / item.budgetAmount)
      : '-';
    y = drawTableRow(doc, y, [
      item.accountName,
      formatCurrency(item.budgetAmount),
      formatCurrency(item.actualAmount),
      formatCurrency(item.variance),
      achieveRate,
    ], colWidths);
  }
}

// ── 部門別損益ページ描画 ──
function renderDepartmentPLPage(doc: PDFKit.PDFDocument, companyName: string, deptPLs: DepartmentPL[], _fontLoaded: boolean): void {
  let y = drawTitle(doc, `${companyName} 部門別損益`, deptPLs[0]?.yearMonth ?? '');

  const deptWidth = Math.min(100, 400 / deptPLs.length);
  const colWidths = [120, ...deptPLs.map(() => deptWidth), deptWidth];

  const headers = ['項目', ...deptPLs.map(d => d.departmentName), '合計'];
  y = drawTableHeader(doc, y, headers, colWidths);

  const rows = [
    { key: 'revenue', label: '売上高' },
    { key: 'costOfSales', label: '売上原価' },
    { key: 'grossProfit', label: '売上総利益' },
    { key: 'directExpenses', label: '直接経費' },
    { key: 'allocatedExpenses', label: '配賦経費' },
    { key: 'departmentProfit', label: '部門利益' },
  ];

  for (const { key, label } of rows) {
    const values = [label];
    let total = 0;
    for (const dept of deptPLs) {
      const val = dept[key as keyof DepartmentPL] as number;
      values.push(formatCurrency(val));
      total += val;
    }
    values.push(formatCurrency(total));

    const bg = label.includes('利益') ? '#D6E4F0' : undefined;
    y = drawTableRow(doc, y, values, colWidths, { bgColor: bg });
  }
}
