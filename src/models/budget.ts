import * as fs from 'fs';
import {
  AnnualBudget,
  MonthlyBudgetItem,
  BudgetActualComparison,
  BudgetActualItem,
  JournalEntry,
  AccountMaster,
} from '../types';
import { findAccountByCode, DEFAULT_ACCOUNTS } from '../utils/accounts';
import { toYearMonth, getMonthRange } from '../utils/date';

/**
 * 年次予算計画の設定ファイルを読み込む
 *
 * JSON形式の設定ファイル例:
 * {
 *   "fiscalYear": 2026,
 *   "fiscalYearStart": "2026-04",
 *   "fiscalYearEnd": "2027-03",
 *   "revenue": [
 *     { "accountCode": "4100", "accountName": "売上高", "monthly": [100, 110, 120, ...] },
 *     { "accountCode": "4100", "accountName": "売上高", "departmentCode": "DEPT01", "monthly": [60, 66, 72, ...] }
 *   ],
 *   "costOfSales": [
 *     { "accountCode": "5100", "accountName": "仕入高", "monthly": [50, 55, 60, ...] }
 *   ],
 *   "sgaExpenses": [
 *     { "accountCode": "6101", "accountName": "給料手当", "monthly": [200, 200, 200, ...] },
 *     { "accountCode": "6125", "accountName": "地代家賃", "monthly": [100, 100, 100, ...] }
 *   ]
 * }
 */
export function loadAnnualBudget(filePath: string): AnnualBudget {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const months = getMonthRange(
    `${data.fiscalYearStart}-01`,
    `${data.fiscalYearEnd}-01`
  );

  const expandItems = (
    items: { accountCode: string; accountName: string; departmentCode?: string; monthly: number[] }[]
  ): MonthlyBudgetItem[] => {
    const result: MonthlyBudgetItem[] = [];
    for (const item of items || []) {
      for (let i = 0; i < months.length && i < item.monthly.length; i++) {
        result.push({
          yearMonth: months[i],
          accountCode: item.accountCode,
          accountName: item.accountName,
          departmentCode: item.departmentCode,
          amount: item.monthly[i] * 10000, // 万円単位で入力 → 円に変換
        });
      }
    }
    return result;
  };

  return {
    fiscalYear: data.fiscalYear,
    fiscalYearStart: data.fiscalYearStart,
    fiscalYearEnd: data.fiscalYearEnd,
    revenueBudget: expandItems(data.revenue || []),
    sgaBudget: expandItems(data.sgaExpenses || []),
    costOfSalesBudget: expandItems(data.costOfSales || []),
  };
}

/**
 * 予実対比を計算
 */
export function calculateBudgetActual(
  budget: AnnualBudget,
  entries: JournalEntry[],
  yearMonth: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): BudgetActualComparison {
  // 予算データの当月分を取得
  const allBudgetItems = [
    ...budget.revenueBudget,
    ...budget.costOfSalesBudget,
    ...budget.sgaBudget,
  ];
  const monthBudget = allBudgetItems.filter(b => b.yearMonth === yearMonth);

  // 実績データの当月分を集計
  const monthEntries = entries.filter(e => toYearMonth(e.date) === yearMonth);

  const actualByAccount = new Map<string, number>();
  for (const entry of monthEntries) {
    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account) continue;

    const key = entry.accountCode + (entry.departmentName ? `_${entry.departmentName}` : '');

    if (account.category === 'revenue') {
      // 売上は貸方がプラス
      const current = actualByAccount.get(key) ?? 0;
      actualByAccount.set(key, current + entry.credit - entry.debit);
    } else {
      // 費用は借方がプラス
      const current = actualByAccount.get(key) ?? 0;
      actualByAccount.set(key, current + entry.debit - entry.credit);
    }
  }

  // 予実対比データ作成
  const items: BudgetActualItem[] = [];
  const processedKeys = new Set<string>();

  for (const budgetItem of monthBudget) {
    const key = budgetItem.accountCode + (budgetItem.departmentCode ? `_${budgetItem.departmentCode}` : '');
    processedKeys.add(key);

    const actualAmount = actualByAccount.get(key) ?? 0;
    const variance = actualAmount - budgetItem.amount;
    const varianceRate = budgetItem.amount !== 0
      ? variance / budgetItem.amount
      : 0;

    items.push({
      accountCode: budgetItem.accountCode,
      accountName: budgetItem.accountName,
      departmentCode: budgetItem.departmentCode,
      budgetAmount: budgetItem.amount,
      actualAmount,
      variance,
      varianceRate,
    });
  }

  // 予算にない実績項目も追加
  for (const [key, actualAmount] of actualByAccount) {
    if (processedKeys.has(key)) continue;

    const accountCode = key.split('_')[0];
    const account = findAccountByCode(accountCode, accounts);
    if (!account) continue;

    items.push({
      accountCode,
      accountName: account.name,
      budgetAmount: 0,
      actualAmount,
      variance: actualAmount,
      varianceRate: 0,
    });
  }

  return { yearMonth, items };
}

/**
 * 累計予実対比を計算
 */
export function calculateCumulativeBudgetActual(
  budget: AnnualBudget,
  entries: JournalEntry[],
  fromMonth: string,
  toMonth: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): BudgetActualComparison {
  const months = getMonthRange(`${fromMonth}-01`, `${toMonth}-01`);
  const comparisons = months.map(m =>
    calculateBudgetActual(budget, entries, m, accounts)
  );

  // 科目ごとに累計を集計
  const cumulative = new Map<string, BudgetActualItem>();

  for (const comp of comparisons) {
    for (const item of comp.items) {
      const key = item.accountCode + (item.departmentCode ? `_${item.departmentCode}` : '');
      const existing = cumulative.get(key);

      if (existing) {
        existing.budgetAmount += item.budgetAmount;
        existing.actualAmount += item.actualAmount;
        existing.variance = existing.actualAmount - existing.budgetAmount;
        existing.varianceRate = existing.budgetAmount !== 0
          ? existing.variance / existing.budgetAmount
          : 0;
      } else {
        cumulative.set(key, { ...item });
      }
    }
  }

  return {
    yearMonth: `${fromMonth}〜${toMonth}`,
    items: Array.from(cumulative.values()),
  };
}
