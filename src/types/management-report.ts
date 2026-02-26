// ============================================================
// 経営資料向け型定義 - 実際の出力フォーマットに準拠
// ============================================================

/** 四半期区分 */
export type Quarter = '1Q' | '2Q' | '3Q' | '4Q';

/** 事業部定義 */
export interface BusinessUnit {
  code: string;
  name: string;
  displayOrder: number;
}

/** 予実対比の行データ */
export interface BudgetActualRow {
  label: string;
  budget: number;
  actual: number;
  variance: number;        // 予実差異（実績 - 予算）
  varianceRate: number;    // 増減率（%）小数点なし整数
  isHighlight?: boolean;   // 赤枠ハイライト対象
  isBold?: boolean;        // 太字
  isRate?: boolean;        // パーセント表示の行（売上総利益率等）
}

/** 四半期予実レポート（1Q予実 等） */
export interface QuarterlyBudgetActualReport {
  period: string;          // "18期" 等
  quarter: Quarter;
  title: string;           // "1Q単体の売上は対予算比 7%増、営業利益は対予算比 38%増"
  sections: {
    revenue: QuarterlyRevenueSection;
    costOfSales: BudgetActualRow;
    grossMarginRate: BudgetActualRow; // 売上総利益率
    grossProfit: BudgetActualRow;
    sgaExpenses: BudgetActualRow;     // 販売管理費計
    operatingProfit: BudgetActualRow; // 営業利益
    operatingMarginRate: BudgetActualRow; // 営業利益率
    ordinaryProfit: BudgetActualRow;  // 経常利益
  };
}

/** 売上高セクション（事業部別内訳付き） */
export interface QuarterlyRevenueSection {
  total: BudgetActualRow;  // 売上高合計
  byDepartment: BudgetActualRow[]; // 事業部別
}

/** 上半期/通期予実レポート（前年比較付き） */
export interface PeriodBudgetActualReport {
  period: string;           // "18期上半期予実" / "18期通期見通し"
  title: string;
  commentBullets: string[]; // 上部のコメント箇条書き
  sections: {
    revenue: PeriodRevenueSection;
    costOfSales: PeriodComparisonRow;
    grossMarginRate: PeriodComparisonRow;
    grossProfit: PeriodComparisonRow;
    sgaExpenses: PeriodComparisonRow;
    operatingProfit: PeriodComparisonRow;
    operatingMarginRate: PeriodComparisonRow;
    ordinaryProfit: PeriodComparisonRow;
  };
}

export interface PeriodRevenueSection {
  total: PeriodComparisonRow;
  byDepartment: PeriodComparisonRow[];
}

/** 期間比較行（前年・予算・実績・対前年比差・対予算比差） */
export interface PeriodComparisonRow {
  label: string;
  previousYear: number;     // 前期実績
  budget: number;           // 予算
  actual: number;           // 実績（or 予測）
  yoyVariance?: number;     // 対前年比差
  yoyVarianceRate?: number; // 対前年比率
  budgetVariance?: number;  // 対予算比差
  budgetVarianceRate?: number; // 対予算比率
  isHighlight?: boolean;
  isBold?: boolean;
  isRate?: boolean;
}

/** 通期見通しグラフデータ */
export interface AnnualForecastChart {
  title: string;             // "18期通期見通し"
  subtitle: string;          // "売上目標 1億500万円に対し、通期 -230万の見通し"
  quarters: Quarter[];
  budgetCumulative: number[];     // 予算の四半期累計
  actualCumulative: number[];     // 実績/見込みの四半期累計（実績+予測）
  actualQuarters: number;         // 実績確定済みの四半期数
}

/** 管理会計レポート */
export interface ManagementAccountingReport {
  period: string;
  quarter: Quarter;
  title: string;             // "管理会計 2Q"
  subtitle: string;          // "Q毎の営業利益差を考慮しながら、リソース配分を検討していく"

  /** 部門別営業利益テーブル */
  profitTable: DepartmentProfitTable;

  /** 人件費配分テーブル */
  staffAllocationTable: StaffAllocationTable;

  /** コメント箇条書き */
  comments: string[];
}

/** 部門別営業利益テーブル */
export interface DepartmentProfitTable {
  quarterLabel: string;      // "18期 2Q"
  departments: string[];     // ["人材育成", "出版", "地域づくり", "その他", "本社費", "合計"]
  rows: {
    label: string;
    values: number[];        // 部門ごとの値（千円単位）
  }[];
  /** 各四半期の前期比率行 */
  ratioRows?: {
    label: string;           // "17期 Q2"
    values: (string | number)[];
  }[];
}

/** 人件費配分テーブル（人別×部門） */
export interface StaffAllocationTable {
  quarterLabel: string;
  staffMembers: string[];    // ["岡部", "長島", "萩原", "吉村", "岡本", "三重野"]
  departments: string[];     // ["人材育成", "出版", "地域づくり", "その他", "本社費"]
  allocations: number[][];   // staffMembers × departments のパーセンテージマトリクス
}

/** 人件費配分の入力データ */
export interface StaffAllocationInput {
  quarter: Quarter;
  yearMonth: string;
  members: {
    name: string;
    monthlyCost: number;     // 月額人件費
    allocation: Record<string, number>; // 部門コード → パーセンテージ
  }[];
}
