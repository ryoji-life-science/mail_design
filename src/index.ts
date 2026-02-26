import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';

import { parseMFJournalCSV } from './parsers/moneyforward';
import { loadAnnualBudget } from './models/budget';
import { generateBalanceSheet } from './reports/balance-sheet';
import { generateIncomeStatement } from './reports/income-statement';
import { generateCashFlowStatement } from './reports/cashflow';
import { calculateFinancialRatios } from './reports/ratio-analysis';
import { generateMonthlyTrend } from './reports/monthly-trend';
import {
  generateQuarterlyReport,
  generatePeriodReport,
  generateAnnualForecastChart,
} from './reports/quarterly-budget-actual';
import { generateManagementAccountingReport } from './reports/management-accounting';
import { generateExcelReport } from './output/excel';
import { generatePDFReport } from './output/pdf';
import { generateManagementExcel } from './output/excel-management';

import {
  generate18thPeriodEntries,
  generate17thPeriodEntries,
  generate18thBudget,
  generateStaffAllocation1Q,
  generateStaffAllocation2Q,
  DEPARTMENT_NAMES,
  DEPARTMENT_CODES,
} from './sample-data';

const program = new Command();

program
  .name('financial-report')
  .description('財務経営資料の自動作成ツール')
  .version('1.0.0');

// ================================================================
// generate コマンド: サンプルデータで全レポートを生成
// ================================================================
program
  .command('generate')
  .description('サンプルデータで全レポートを生成')
  .option('-o, --output <dir>', '出力ディレクトリ', './output')
  .option('-q, --quarter <quarter>', '対象四半期 (1Q/2Q/3Q/4Q)', '1Q')
  .option('--period <period>', '期の表示名', '18期')
  .action(async (opts) => {
    const outputDir = path.resolve(opts.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('📊 財務経営資料を生成します...');
    console.log(`   出力先: ${outputDir}`);
    console.log(`   対象: ${opts.period} ${opts.quarter}`);

    // サンプルデータ読み込み
    const currentEntries = generate18thPeriodEntries();
    const previousEntries = generate17thPeriodEntries();
    const budget = generate18thBudget();
    const quarter = opts.quarter;
    const periodLabel = opts.period;

    console.log(`\n   仕訳件数: 当期 ${currentEntries.length}件、前期 ${previousEntries.length}件`);

    // ── 1. 四半期予実レポート ──
    console.log('\n📋 1. 四半期予実レポートを生成中...');
    const quarterlyReport = generateQuarterlyReport(
      currentEntries,
      budget,
      quarter as any,
      DEPARTMENT_NAMES,
      DEPARTMENT_CODES,
      periodLabel
    );
    console.log(`   ${quarterlyReport.title}`);

    // ── 2. 上半期予実レポート ──
    console.log('📋 2. 上半期予実レポートを生成中...');
    const halfYearReport = generatePeriodReport(
      currentEntries,
      previousEntries,
      budget,
      ['1Q', '2Q'],
      DEPARTMENT_NAMES,
      DEPARTMENT_CODES,
      `${periodLabel}上半期予実`
    );

    // ── 3. 通期見通しレポート ──
    console.log('📋 3. 通期見通しレポートを生成中...');
    const annualReport = generatePeriodReport(
      currentEntries,
      previousEntries,
      budget,
      ['1Q', '2Q', '3Q', '4Q'],
      DEPARTMENT_NAMES,
      DEPARTMENT_CODES,
      `${periodLabel}通期見通し`
    );

    // ── 4. 通期見通しグラフデータ ──
    console.log('📋 4. 通期見通しグラフデータを生成中...');
    const forecastChart = generateAnnualForecastChart(
      currentEntries,
      budget,
      2, // 2Q分まで実績確定
    );

    // ── 5. 管理会計レポート ──
    console.log('📋 5. 管理会計レポートを生成中...');
    const staffAllocation = quarter === '1Q' ? generateStaffAllocation1Q() : generateStaffAllocation2Q();
    const mgmtAccounting = generateManagementAccountingReport(
      currentEntries,
      previousEntries,
      staffAllocation,
      '2025-10',
      '2024-10',
      periodLabel,
      DEPARTMENT_NAMES,
    );

    // ── 6. 財務3表 ──
    console.log('📋 6. 財務3表を生成中...');
    const pl = generateIncomeStatement(currentEntries, '2025-10-01', '2026-09-30');
    const bs = generateBalanceSheet(currentEntries, '2026-09-30');
    const cf = generateCashFlowStatement(currentEntries, '2025-10-01', '2026-09-30', pl);
    const ratios = calculateFinancialRatios(bs, pl, '2026-09');
    const trend = generateMonthlyTrend(currentEntries, '2025-10', '2026-09');

    // ── Excel出力: 経営資料 ──
    console.log('\n💾 経営資料Excelを出力中...');
    const mgmtExcelPath = path.join(outputDir, `${periodLabel}_経営資料_${quarter}.xlsx`);
    await generateManagementExcel(mgmtExcelPath, '', {
      quarterlyReport,
      halfYearReport,
      annualReport,
      forecastChart,
      managementAccounting: mgmtAccounting,
    });
    console.log(`   ✅ ${mgmtExcelPath}`);

    // ── Excel出力: 財務3表 ──
    console.log('💾 財務3表Excelを出力中...');
    const finExcelPath = path.join(outputDir, `${periodLabel}_財務諸表.xlsx`);
    await generateExcelReport(finExcelPath, '', {
      bs,
      pl,
      cf,
      ratios,
      trend,
    });
    console.log(`   ✅ ${finExcelPath}`);

    // ── PDF出力 ──
    console.log('💾 PDFを出力中...');
    const pdfPath = path.join(outputDir, `${periodLabel}_財務諸表.pdf`);
    await generatePDFReport(pdfPath, '', {
      bs,
      pl,
      cf,
      ratios,
    });
    console.log(`   ✅ ${pdfPath}`);

    console.log('\n🎉 全レポートの生成が完了しました！');
  });

// ================================================================
// import-mf コマンド: マネーフォワードCSVをインポート
// ================================================================
program
  .command('import-mf')
  .description('マネーフォワードCSVファイルをインポートして仕訳データに変換')
  .requiredOption('-f, --file <path>', 'CSVファイルパス')
  .option('-o, --output <path>', '出力JSONファイルパス')
  .action((opts) => {
    console.log(`📥 マネーフォワードCSVをインポート: ${opts.file}`);

    if (!fs.existsSync(opts.file)) {
      console.error(`❌ ファイルが見つかりません: ${opts.file}`);
      process.exit(1);
    }

    const entries = parseMFJournalCSV(opts.file);
    console.log(`   ${entries.length}件の仕訳を読み込みました`);

    if (opts.output) {
      fs.writeFileSync(opts.output, JSON.stringify(entries, null, 2), 'utf-8');
      console.log(`   ✅ ${opts.output} に保存しました`);
    } else {
      // 集計サマリーを表示
      const accounts = new Map<string, number>();
      for (const entry of entries) {
        const current = accounts.get(entry.accountName) ?? 0;
        accounts.set(entry.accountName, current + entry.debit + entry.credit);
      }

      console.log('\n   === 科目別集計 ===');
      const sorted = Array.from(accounts.entries()).sort((a, b) => b[1] - a[1]);
      for (const [name, total] of sorted.slice(0, 20)) {
        console.log(`   ${name}: ${total.toLocaleString('ja-JP')}円`);
      }
    }
  });

// ================================================================
// メイン実行
// ================================================================
program.parse();

// デフォルト（引数なし）の場合は generate を実行
if (process.argv.length <= 2) {
  program.parse(['node', 'financial-report', 'generate']);
}
