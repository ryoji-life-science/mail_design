import ExcelJS from 'exceljs';
import {
  QuarterlyBudgetActualReport,
  BudgetActualRow,
  PeriodBudgetActualReport,
  PeriodComparisonRow,
  AnnualForecastChart,
  ManagementAccountingReport,
} from '../types/management-report';

// ── スタイル定数 ──
const DARK_BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
const MID_BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
const LIGHT_BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
const VERY_LIGHT_BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };
const WHITE_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
const BOLD_FONT: Partial<ExcelJS.Font> = { bold: true, size: 10 };
const NORMAL_FONT: Partial<ExcelJS.Font> = { size: 10 };
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFF0000' }, bold: true, size: 10 };
const RED_BOX_BORDER: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FFFF0000' } };
const THIN_BORDER: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFB0B0B0' } };
const NUM_FMT = '#,##0';
const PCT_FMT = '0%';

function setBorders(cell: ExcelJS.Cell): void {
  cell.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
}

function setRedBorder(cells: ExcelJS.Cell[]): void {
  for (const cell of cells) {
    cell.border = {
      top: RED_BOX_BORDER,
      left: RED_BOX_BORDER,
      bottom: RED_BOX_BORDER,
      right: RED_BOX_BORDER,
    };
  }
}

function formatNegative(value: number): string {
  if (value < 0) return `(${Math.abs(value).toLocaleString('ja-JP')})`;
  return value.toLocaleString('ja-JP');
}

/**
 * 経営資料Excelを生成
 */
export async function generateManagementExcel(
  outputPath: string,
  companyName: string,
  data: {
    quarterlyReport?: QuarterlyBudgetActualReport;
    halfYearReport?: PeriodBudgetActualReport;
    annualReport?: PeriodBudgetActualReport;
    forecastChart?: AnnualForecastChart;
    managementAccounting?: ManagementAccountingReport;
  }
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '財務経営資料自動作成ツール';
  workbook.created = new Date();

  if (data.quarterlyReport) {
    addQuarterlySheet(workbook, data.quarterlyReport);
  }
  if (data.halfYearReport) {
    addPeriodSheet(workbook, data.halfYearReport, '上半期予実');
  }
  if (data.annualReport) {
    addPeriodSheet(workbook, data.annualReport, '通期見通し');
  }
  if (data.forecastChart) {
    addForecastChartSheet(workbook, data.forecastChart);
  }
  if (data.managementAccounting) {
    addManagementAccountingSheet(workbook, data.managementAccounting);
  }

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

// ================================================================
// 四半期予実シート（1Q予実）
// ================================================================
function addQuarterlySheet(wb: ExcelJS.Workbook, report: QuarterlyBudgetActualReport): void {
  const ws = wb.addWorksheet(`${report.quarter}`);
  ws.columns = [
    { width: 3 },   // A: spacer
    { width: 20 },  // B: 科目
    { width: 16 },  // C: 予算
    { width: 16 },  // D: 実績
    { width: 16 },  // E: 予実差異
    { width: 10 },  // F: 増減%
  ];

  // ── タブ風ヘッダー ──
  let row = 1;
  ws.mergeCells(`A${row}:A${row}`);
  const tabCell = ws.getCell(`A${row}`);
  tabCell.value = report.quarter;
  tabCell.fill = DARK_BLUE;
  tabCell.font = { ...WHITE_FONT, size: 12 };
  tabCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // タイトル
  row = 3;
  ws.mergeCells(`A${row}:F${row}`);
  const titleCell = ws.getCell(`A${row}`);
  titleCell.value = `◆${report.title}`;
  titleCell.font = { bold: true, size: 11 };

  // ── テーブルヘッダー ──
  row = 5;
  const headerLabels = ['', `${report.quarter}予算`, `${report.quarter}実績`, '予実差異', '増減%'];
  const headerRow = ws.getRow(row);
  headerRow.values = ['', ...headerLabels.slice(1)];
  // ヘッダーのB列を空、C-F列をスタイリング
  for (let c = 2; c <= 6; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = MID_BLUE;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorders(cell);
  }

  // ── データ行 ──
  row = 6;
  const allRows: { row: BudgetActualRow; indent?: boolean }[] = [
    { row: report.sections.revenue.total },
    ...report.sections.revenue.byDepartment.map(r => ({ row: r, indent: true })),
    { row: report.sections.costOfSales },
    { row: report.sections.grossMarginRate },
    { row: report.sections.grossProfit },
    { row: report.sections.sgaExpenses },
    { row: report.sections.operatingProfit },
    { row: report.sections.operatingMarginRate },
    { row: report.sections.ordinaryProfit },
  ];

  let alternateColor = false;
  for (const { row: data, indent } of allRows) {
    const r = ws.getRow(row);
    const label = indent ? `　${data.label}` : data.label;

    if (data.isRate) {
      r.values = ['', label, `${data.budget}%`, `${data.actual}%`, '', ''];
    } else {
      r.values = ['', label, data.budget, data.actual, data.variance, `${data.varianceRate}%`];
    }

    // セルスタイリング
    for (let c = 2; c <= 6; c++) {
      const cell = ws.getCell(row, c);
      setBorders(cell);

      if (c >= 3 && c <= 5 && !data.isRate) {
        cell.numFmt = NUM_FMT;
        cell.alignment = { horizontal: 'right' };
      }

      // 交互背景色
      if (alternateColor) {
        cell.fill = VERY_LIGHT_BLUE;
      }
    }

    // 太字行
    if (data.isBold || data.label.includes('合計') || data.label.includes('利益')) {
      r.font = BOLD_FONT;
    }

    // マイナス値の赤枠ハイライト
    if (data.isHighlight && data.variance !== 0) {
      const varCell = ws.getCell(row, 5);
      const rateCell = ws.getCell(row, 6);
      if (data.variance < 0) {
        setRedBorder([varCell]);
        varCell.font = RED_FONT;
      }
    }

    // マイナスの差異をカッコ表示
    if (!data.isRate && data.variance < 0) {
      const varCell = ws.getCell(row, 5);
      varCell.value = formatNegative(data.variance);
      varCell.font = { ...RED_FONT };
    }

    alternateColor = !alternateColor;
    row++;
  }
}

// ================================================================
// 期間予実シート（上半期予実 / 通期見通し）
// ================================================================
function addPeriodSheet(wb: ExcelJS.Workbook, report: PeriodBudgetActualReport, sheetName: string): void {
  const ws = wb.addWorksheet(sheetName);
  ws.columns = [
    { width: 3 },   // A
    { width: 18 },  // B: 科目
    { width: 16 },  // C: 前期実績
    { width: 16 },  // D: 予算
    { width: 16 },  // E: 実績
    { width: 14 },  // F: 対前年比差 or 対予算比増減率
    { width: 10 },  // G: 対予算比差
  ];

  // タブ
  let row = 1;
  const tabCell = ws.getCell(`A${row}`);
  tabCell.value = sheetName.includes('通期') ? '通期' : '上半期';
  tabCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B4513' } }; // 茶色
  tabCell.font = { ...WHITE_FONT, size: 12 };
  tabCell.alignment = { horizontal: 'center' };

  // タイトル
  row = 2;
  ws.mergeCells(`A${row}:G${row}`);
  ws.getCell(`A${row}`).value = report.title;
  ws.getCell(`A${row}`).font = { bold: true, size: 14 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };

  // コメント
  row = 4;
  for (const comment of report.commentBullets) {
    ws.mergeCells(`A${row}:G${row}`);
    ws.getCell(`A${row}`).value = `◆${comment}`;
    ws.getCell(`A${row}`).font = { size: 9 };
    row++;
  }
  row++;

  // ヘッダー
  const isAnnual = sheetName.includes('通期');
  const headers = isAnnual
    ? ['', '前期実績', '今期予算', '今期予測', '対予算比増減率']
    : ['', '前期実績', '予算', '実績', '対前年比差', '対予算比差'];

  const headerRow = ws.getRow(row);
  headerRow.values = ['', ...headers.slice(1)];
  for (let c = 2; c <= (isAnnual ? 6 : 7); c++) {
    const cell = ws.getCell(row, c);
    cell.fill = MID_BLUE;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center' };
    setBorders(cell);
  }
  row++;

  // データ行
  const allRows: { data: PeriodComparisonRow; indent?: boolean }[] = [
    { data: report.sections.revenue.total },
    ...report.sections.revenue.byDepartment.map(r => ({ data: r, indent: true })),
    { data: report.sections.costOfSales },
    { data: report.sections.grossMarginRate },
    { data: report.sections.grossProfit },
    { data: report.sections.sgaExpenses },
    { data: report.sections.operatingProfit },
    { data: report.sections.operatingMarginRate },
    { data: report.sections.ordinaryProfit },
  ];

  let alt = false;
  for (const { data, indent } of allRows) {
    const r = ws.getRow(row);
    const label = indent ? `　${data.label}` : data.label;

    if (data.isRate) {
      if (isAnnual) {
        r.values = ['', label, `${data.previousYear}%`, `${data.budget}%`, `${data.actual}%`, ''];
      } else {
        r.values = ['', label, `${data.previousYear}%`, `${data.budget}%`, `${data.actual}%`, '', ''];
      }
    } else if (isAnnual) {
      r.values = ['', label, data.previousYear, data.budget, data.actual,
        data.budgetVarianceRate !== undefined ? `${data.budgetVarianceRate}%` : ''];
    } else {
      r.values = ['', label, data.previousYear, data.budget, data.actual,
        data.yoyVariance ?? '', data.budgetVarianceRate !== undefined ? `${data.budgetVarianceRate}%` : ''];
    }

    const maxCol = isAnnual ? 6 : 7;
    for (let c = 2; c <= maxCol; c++) {
      const cell = ws.getCell(row, c);
      setBorders(cell);
      if (c >= 3 && c <= 5 && !data.isRate) {
        cell.numFmt = NUM_FMT;
        cell.alignment = { horizontal: 'right' };
      }
      if (alt) cell.fill = VERY_LIGHT_BLUE;
    }

    if (data.isBold || data.label.includes('利益')) {
      r.font = BOLD_FONT;
    }

    // ハイライト（赤枠）
    if (data.isHighlight) {
      const highlightCol = isAnnual ? 6 : 7;
      const cell = ws.getCell(row, highlightCol);
      if ((data.budgetVarianceRate ?? 0) < 0) {
        setRedBorder([cell]);
        cell.font = RED_FONT;
      }
    }

    alt = !alt;
    row++;
  }
}

// ================================================================
// 通期見通しグラフシート
// ================================================================
function addForecastChartSheet(wb: ExcelJS.Workbook, chart: AnnualForecastChart): void {
  const ws = wb.addWorksheet('通期見通しグラフ');
  ws.columns = [
    { width: 3 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  // タブ
  ws.getCell('A1').value = '通期';
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B4513' } };
  ws.getCell('A1').font = { ...WHITE_FONT, size: 12 };

  // タイトル
  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = chart.title;
  ws.getCell('A3').font = { bold: true, size: 14 };
  ws.getCell('A3').alignment = { horizontal: 'center' };

  ws.mergeCells('A4:F4');
  ws.getCell('A4').value = chart.subtitle;
  ws.getCell('A4').font = { size: 10 };
  ws.getCell('A4').alignment = { horizontal: 'center' };

  // データテーブル
  let row = 6;
  const headerRow = ws.getRow(row);
  headerRow.values = ['', '', '1Q', '2Q', '3Q', '4Q'];
  for (let c = 2; c <= 6; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = MID_BLUE;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center' };
  }
  row++;

  // 予算累計
  const budgetRow = ws.getRow(row);
  budgetRow.values = ['', '予算（累計）', ...chart.budgetCumulative];
  for (let c = 3; c <= 6; c++) {
    ws.getCell(row, c).numFmt = NUM_FMT;
  }
  row++;

  // 実績/見込み累計
  const actualRow = ws.getRow(row);
  actualRow.values = ['', '実績/見込み（累計）', ...chart.actualCumulative];
  for (let c = 3; c <= 6; c++) {
    ws.getCell(row, c).numFmt = NUM_FMT;
    // 実績確定済み四半期は太字
    if (c - 2 <= chart.actualQuarters) {
      ws.getCell(row, c).font = BOLD_FONT;
    } else {
      ws.getCell(row, c).font = { italic: true, size: 10 };
    }
  }
  row++;

  // グラフ用の凡例説明
  row += 2;
  ws.getCell(`B${row}`).value = '── 予算';
  ws.getCell(`B${row}`).font = { size: 9 };
  row++;
  ws.getCell(`B${row}`).value = '── 実績/見込み';
  ws.getCell(`B${row}`).font = { size: 9, bold: true };
  row++;
  ws.getCell(`B${row}`).value = '- - - 見込み部分（点線）';
  ws.getCell(`B${row}`).font = { size: 9, italic: true };

  // 注: ExcelJSにはネイティブのチャート機能がないため、
  // データテーブルを出力してユーザーがExcel上でチャートを挿入できるようにする
}

// ================================================================
// 管理会計シート
// ================================================================
function addManagementAccountingSheet(wb: ExcelJS.Workbook, report: ManagementAccountingReport): void {
  const ws = wb.addWorksheet(`管理会計${report.quarter}`);

  const deptCount = report.profitTable.departments.length;
  const cols: Partial<ExcelJS.Column>[] = [{ width: 3 }, { width: 14 }];
  for (let i = 0; i < deptCount; i++) {
    cols.push({ width: 13 });
  }
  ws.columns = cols;

  // タブ
  ws.getCell('A1').value = report.quarter;
  ws.getCell('A1').fill = DARK_BLUE;
  ws.getCell('A1').font = { ...WHITE_FONT, size: 12 };

  // タイトル
  let row = 2;
  ws.mergeCells(`A${row}:${String.fromCharCode(65 + deptCount + 1)}${row}`);
  ws.getCell(`A${row}`).value = report.title;
  ws.getCell(`A${row}`).font = { bold: true, size: 14 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };

  row = 3;
  ws.mergeCells(`A${row}:${String.fromCharCode(65 + deptCount + 1)}${row}`);
  ws.getCell(`A${row}`).value = report.subtitle;
  ws.getCell(`A${row}`).font = { size: 10 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };

  // ── 部門別営業利益テーブル ──
  row = 5;
  ws.mergeCells(`A${row}:${String.fromCharCode(65 + deptCount + 1)}${row}`);
  ws.getCell(`A${row}`).value = `◆Q毎の営業利益`;
  ws.getCell(`A${row}`).font = { bold: true, size: 11 };
  row++;

  // ヘッダー
  const profitHeaderRow = ws.getRow(row);
  const phValues: string[] = ['', report.profitTable.quarterLabel];
  for (const dept of report.profitTable.departments) {
    phValues.push(dept);
  }
  profitHeaderRow.values = phValues;
  for (let c = 2; c <= deptCount + 2; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = MID_BLUE;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center' };
    setBorders(cell);
  }
  row++;

  // 単位行
  ws.getCell(`B${row}`).value = '単位: 千円';
  ws.getCell(`B${row}`).font = { size: 8, italic: true };
  row++;

  // データ行
  for (const profitRow of report.profitTable.rows) {
    const r = ws.getRow(row);
    const values: (string | number)[] = ['', profitRow.label, ...profitRow.values];
    r.values = values;

    for (let c = 2; c <= deptCount + 2; c++) {
      const cell = ws.getCell(row, c);
      setBorders(cell);
      if (c >= 3) {
        cell.numFmt = NUM_FMT;
        cell.alignment = { horizontal: 'right' };
      }
    }

    if (profitRow.label.includes('利益') || profitRow.label === '売上高') {
      ws.getRow(row).font = BOLD_FONT;
    }

    // 営業利益行のハイライト
    if (profitRow.label === '営業利益') {
      for (let c = 3; c <= deptCount + 2; c++) {
        const cell = ws.getCell(row, c);
        if (typeof cell.value === 'number' && cell.value < 0) {
          cell.font = RED_FONT;
        }
        cell.fill = LIGHT_BLUE;
      }
    }

    row++;
  }

  // 前期比率行
  if (report.profitTable.ratioRows) {
    for (const ratioRow of report.profitTable.ratioRows) {
      const r = ws.getRow(row);
      r.values = ['', ratioRow.label, ...ratioRow.values];
      for (let c = 2; c <= deptCount + 2; c++) {
        const cell = ws.getCell(row, c);
        setBorders(cell);
        cell.fill = VERY_LIGHT_BLUE;
        cell.alignment = { horizontal: 'right' };
      }
      r.font = { size: 9, italic: true };
      row++;
    }
  }

  // ── 人件費配分テーブル ──
  row += 2;
  ws.mergeCells(`A${row}:${String.fromCharCode(65 + deptCount + 1)}${row}`);
  ws.getCell(`A${row}`).value = '◆Q毎の人件費配分';
  ws.getCell(`A${row}`).font = { bold: true, size: 11 };
  row++;

  const sat = report.staffAllocationTable;

  // ヘッダー行
  const satHeader = ws.getRow(row);
  const satHeaderValues: string[] = ['', report.quarter];
  for (const dept of sat.departments) {
    satHeaderValues.push(dept);
  }
  satHeader.values = satHeaderValues;
  for (let c = 2; c <= sat.departments.length + 2; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = MID_BLUE;
    cell.font = WHITE_FONT;
    cell.alignment = { horizontal: 'center' };
    setBorders(cell);
  }
  row++;

  // 各スタッフの配分
  for (let i = 0; i < sat.staffMembers.length; i++) {
    const r = ws.getRow(row);
    const values: (string | number)[] = ['', sat.staffMembers[i]];
    for (const pct of sat.allocations[i]) {
      values.push(`${pct}%`);
    }
    r.values = values;

    for (let c = 2; c <= sat.departments.length + 2; c++) {
      const cell = ws.getCell(row, c);
      setBorders(cell);
      if (c >= 3) {
        cell.alignment = { horizontal: 'right' };
      }
    }

    // 交互色
    if (i % 2 === 1) {
      for (let c = 2; c <= sat.departments.length + 2; c++) {
        ws.getCell(row, c).fill = VERY_LIGHT_BLUE;
      }
    }

    row++;
  }

  // コメント
  if (report.comments.length > 0) {
    row += 2;
    for (const comment of report.comments) {
      ws.mergeCells(`A${row}:${String.fromCharCode(65 + deptCount + 1)}${row}`);
      ws.getCell(`A${row}`).value = `■${comment}`;
      ws.getCell(`A${row}`).font = { size: 9 };
      row++;
    }
  }
}
