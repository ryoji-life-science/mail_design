import {
  FinancialRatios,
  BalanceSheet,
  IncomeStatement,
} from '../types';

/**
 * 財務比率分析を計算
 */
export function calculateFinancialRatios(
  bs: BalanceSheet,
  pl: IncomeStatement,
  yearMonth: string
): FinancialRatios {
  const totalAssets = bs.assets.total;
  const totalLiabilities = bs.liabilities.total;
  const totalEquity = bs.equity.total;
  const revenue = pl.revenue.total;

  // 流動資産・流動負債の合計を取得
  const currentAssets = bs.assets.items
    .find(i => i.accountName === '流動資産合計')?.amount ?? 0;
  const currentLiabilities = bs.liabilities.items
    .find(i => i.accountName === '流動負債合計')?.amount ?? 0;

  // 売上債権
  const receivables = bs.assets.items
    .filter(i => i.accountName === '売掛金' || i.accountName === '受取手形')
    .reduce((sum, i) => sum + i.amount, 0);

  const safeDivide = (numerator: number, denominator: number): number => {
    return denominator !== 0 ? numerator / denominator : 0;
  };

  return {
    yearMonth,

    // 収益性指標
    grossProfitMargin: safeDivide(pl.grossProfit, revenue),
    operatingProfitMargin: safeDivide(pl.operatingIncome, revenue),
    ordinaryProfitMargin: safeDivide(pl.ordinaryIncome, revenue),
    netProfitMargin: safeDivide(pl.netIncome, revenue),
    roe: safeDivide(pl.netIncome, totalEquity),
    roa: safeDivide(pl.netIncome, totalAssets),

    // 安全性指標
    currentRatio: safeDivide(currentAssets, currentLiabilities),
    equityRatio: safeDivide(totalEquity, totalAssets),
    debtEquityRatio: safeDivide(totalLiabilities, totalEquity),

    // 効率性指標
    totalAssetTurnover: safeDivide(revenue, totalAssets),
    receivableTurnover: safeDivide(revenue, receivables),
  };
}

/** 比率の日本語ラベルマッピング */
export const RATIO_LABELS: Record<string, { label: string; unit: string; description: string }> = {
  grossProfitMargin: { label: '売上総利益率', unit: '%', description: '売上に対する粗利の割合' },
  operatingProfitMargin: { label: '営業利益率', unit: '%', description: '本業での収益力' },
  ordinaryProfitMargin: { label: '経常利益率', unit: '%', description: '経常的な収益力' },
  netProfitMargin: { label: '当期純利益率', unit: '%', description: '最終的な利益率' },
  roe: { label: 'ROE（自己資本利益率）', unit: '%', description: '株主資本の効率性' },
  roa: { label: 'ROA（総資産利益率）', unit: '%', description: '総資産の効率性' },
  currentRatio: { label: '流動比率', unit: '%', description: '短期的な支払い能力（200%以上が理想）' },
  equityRatio: { label: '自己資本比率', unit: '%', description: '財務の安定性（40%以上が望ましい）' },
  debtEquityRatio: { label: '負債資本倍率（D/E）', unit: '倍', description: '負債と自己資本の比率' },
  totalAssetTurnover: { label: '総資産回転率', unit: '回', description: '資産活用の効率性' },
  receivableTurnover: { label: '売上債権回転率', unit: '回', description: '債権回収の効率性' },
};
