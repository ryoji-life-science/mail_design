// ============================================================
// 財務経営資料自動作成ツール - 型定義
// ============================================================

/** 勘定科目の分類 */
export type AccountCategory =
  | 'current_assets'        // 流動資産
  | 'fixed_assets'          // 固定資産
  | 'current_liabilities'   // 流動負債
  | 'fixed_liabilities'     // 固定負債
  | 'equity'                // 純資産
  | 'revenue'               // 売上高
  | 'cost_of_sales'         // 売上原価
  | 'sga_expenses'          // 販管費
  | 'non_operating_income'  // 営業外収益
  | 'non_operating_expense' // 営業外費用
  | 'extraordinary_income'  // 特別利益
  | 'extraordinary_expense' // 特別損失
  | 'tax';                  // 法人税等

/** B/S上の区分 */
export type BSSection = 'assets' | 'liabilities' | 'equity';

/** P/L上の区分 */
export type PLSection =
  | 'revenue'
  | 'cost_of_sales'
  | 'sga_expenses'
  | 'non_operating_income'
  | 'non_operating_expense'
  | 'extraordinary_income'
  | 'extraordinary_expense'
  | 'tax';

/** 勘定科目マスタ */
export interface AccountMaster {
  code: string;
  name: string;
  category: AccountCategory;
  bsSection?: BSSection;
  plSection?: PLSection;
  /** マネーフォワードCSVでの科目名との対応 */
  mfName?: string;
}

/** 仕訳明細 */
export interface JournalEntry {
  date: string;            // YYYY-MM-DD
  accountCode: string;     // 勘定科目コード
  accountName: string;     // 勘定科目名
  subAccountName?: string; // 補助科目名
  departmentName?: string; // 部門名
  debit: number;           // 借方金額
  credit: number;          // 貸方金額
  description?: string;    // 摘要
  taxCategory?: string;    // 税区分
}

/** マネーフォワードCSV仕訳行 */
export interface MFJournalRow {
  取引No: string;
  取引日: string;
  借方勘定科目: string;
  借方補助科目: string;
  借方部門: string;
  借方税区分: string;
  借方金額: string;
  貸方勘定科目: string;
  貸方補助科目: string;
  貸方部門: string;
  貸方税区分: string;
  貸方金額: string;
  摘要: string;
}

/** 月次残高データ */
export interface MonthlyBalance {
  yearMonth: string;       // YYYY-MM
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  balance: number;         // 残高（B/S科目）or 累計発生額（P/L科目）
  monthlyAmount: number;   // 当月発生額
}

// ============================================================
// 部門別管理会計
// ============================================================

/** 部門定義 */
export interface Department {
  code: string;
  name: string;
}

/** 人員稼働割合（月次） */
export interface StaffAllocation {
  yearMonth: string;       // YYYY-MM
  staffName: string;
  departmentAllocations: {
    departmentCode: string;
    percentage: number;    // 0-100
  }[];
  monthlyCost: number;     // 人件費（月額）
}

/** 部門別配賦ルール */
export interface AllocationRule {
  expenseAccountCode: string;  // 配賦対象の経費科目コード
  method: 'headcount' | 'revenue' | 'manual'; // 配賦基準
  manualRatios?: {
    departmentCode: string;
    ratio: number;
  }[];
}

// ============================================================
// 予算計画
// ============================================================

/** 年度予算 */
export interface AnnualBudget {
  fiscalYear: number;         // 年度（例: 2026）
  fiscalYearStart: string;    // 期首月 YYYY-MM
  fiscalYearEnd: string;      // 期末月 YYYY-MM
  revenueBudget: MonthlyBudgetItem[];
  sgaBudget: MonthlyBudgetItem[];
  costOfSalesBudget: MonthlyBudgetItem[];
}

/** 月次予算明細 */
export interface MonthlyBudgetItem {
  yearMonth: string;          // YYYY-MM
  accountCode: string;
  accountName: string;
  departmentCode?: string;
  amount: number;
}

// ============================================================
// 財務諸表
// ============================================================

/** 貸借対照表（B/S） */
export interface BalanceSheet {
  date: string;               // 基準日 YYYY-MM-DD
  assets: BSGroup;            // 資産の部
  liabilities: BSGroup;       // 負債の部
  equity: BSGroup;            // 純資産の部
}

export interface BSGroup {
  label: string;
  items: BSLineItem[];
  total: number;
}

export interface BSLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
}

/** 損益計算書（P/L） */
export interface IncomeStatement {
  periodStart: string;        // 期間開始 YYYY-MM-DD
  periodEnd: string;          // 期間終了 YYYY-MM-DD
  revenue: PLGroup;           // 売上高
  costOfSales: PLGroup;       // 売上原価
  grossProfit: number;        // 売上総利益
  sgaExpenses: PLGroup;       // 販管費
  operatingIncome: number;    // 営業利益
  nonOperatingIncome: PLGroup;  // 営業外収益
  nonOperatingExpense: PLGroup; // 営業外費用
  ordinaryIncome: number;     // 経常利益
  extraordinaryIncome: PLGroup;  // 特別利益
  extraordinaryExpense: PLGroup; // 特別損失
  incomeBeforeTax: number;    // 税引前当期純利益
  tax: PLGroup;               // 法人税等
  netIncome: number;          // 当期純利益
}

export interface PLGroup {
  label: string;
  items: PLLineItem[];
  total: number;
}

export interface PLLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

/** キャッシュフロー計算書（C/F） - 間接法 */
export interface CashFlowStatement {
  periodStart: string;
  periodEnd: string;
  operating: CFSection;       // 営業活動
  investing: CFSection;       // 投資活動
  financing: CFSection;       // 財務活動
  netChange: number;          // 現金増減額
  beginningCash: number;      // 期首現金残高
  endingCash: number;         // 期末現金残高
}

export interface CFSection {
  label: string;
  items: CFLineItem[];
  total: number;
}

export interface CFLineItem {
  label: string;
  amount: number;
}

// ============================================================
// 経営分析
// ============================================================

/** 財務比率分析 */
export interface FinancialRatios {
  yearMonth: string;
  // 収益性
  grossProfitMargin: number;      // 売上総利益率
  operatingProfitMargin: number;  // 営業利益率
  ordinaryProfitMargin: number;   // 経常利益率
  netProfitMargin: number;        // 当期純利益率
  roe: number;                    // ROE（自己資本利益率）
  roa: number;                    // ROA（総資産利益率）
  // 安全性
  currentRatio: number;           // 流動比率
  equityRatio: number;            // 自己資本比率
  debtEquityRatio: number;        // 負債資本倍率
  // 効率性
  totalAssetTurnover: number;     // 総資産回転率
  receivableTurnover: number;     // 売上債権回転率
}

/** 予実対比レポート */
export interface BudgetActualComparison {
  yearMonth: string;
  items: BudgetActualItem[];
}

export interface BudgetActualItem {
  accountCode: string;
  accountName: string;
  departmentCode?: string;
  departmentName?: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;           // 差異（実績 - 予算）
  varianceRate: number;       // 差異率（%）
}

/** 部門別損益 */
export interface DepartmentPL {
  yearMonth: string;
  departmentCode: string;
  departmentName: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  directExpenses: number;     // 直接経費
  allocatedExpenses: number;  // 配賦経費
  departmentProfit: number;   // 部門利益
  details: PLLineItem[];
}

/** 月次推移データ */
export interface MonthlyTrend {
  months: string[];           // YYYY-MM のリスト
  series: TrendSeries[];
}

export interface TrendSeries {
  label: string;
  values: number[];
}

// ============================================================
// 設定
// ============================================================

/** アプリケーション設定 */
export interface AppConfig {
  companyName: string;
  fiscalYearStartMonth: number;   // 期首月（1-12, 例: 4 = 4月始まり）
  departments: Department[];
  accountMaster: AccountMaster[];
  allocationRules: AllocationRule[];
}

/** レポート生成オプション */
export interface ReportOptions {
  periodStart: string;            // YYYY-MM-DD
  periodEnd: string;              // YYYY-MM-DD
  outputDir: string;
  formats: ('excel' | 'pdf')[];
  reports: ReportType[];
  departmentCodes?: string[];     // 指定部門のみ（省略時は全部門）
}

export type ReportType =
  | 'balance_sheet'
  | 'income_statement'
  | 'cashflow'
  | 'ratio_analysis'
  | 'monthly_trend'
  | 'budget_actual'
  | 'department_pl';
