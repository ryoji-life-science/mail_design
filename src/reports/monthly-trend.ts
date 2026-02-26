import {
  JournalEntry,
  MonthlyTrend,
  TrendSeries,
  AccountMaster,
} from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';
import { getMonthRange, toYearMonth } from '../utils/date';

/**
 * 月次推移データを生成
 *
 * 売上高、売上原価、売上総利益、販管費、営業利益の月次推移を計算する。
 */
export function generateMonthlyTrend(
  entries: JournalEntry[],
  periodStart: string,
  periodEnd: string,
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): MonthlyTrend {
  const months = getMonthRange(periodStart, periodEnd);

  // 月ごとにP/L科目を集計
  const monthlyData = new Map<string, Map<string, number>>();
  for (const month of months) {
    monthlyData.set(month, new Map());
  }

  for (const entry of entries) {
    const ym = toYearMonth(entry.date);
    if (!monthlyData.has(ym)) continue;

    const account = findAccountByCode(entry.accountCode, accounts);
    if (!account?.plSection) continue;

    const monthMap = monthlyData.get(ym)!;
    const current = monthMap.get(account.category) ?? 0;

    if (
      account.category === 'revenue' ||
      account.category === 'non_operating_income' ||
      account.category === 'extraordinary_income'
    ) {
      monthMap.set(account.category, current + entry.credit - entry.debit);
    } else {
      monthMap.set(account.category, current + entry.debit - entry.credit);
    }
  }

  // 系列データを構築
  const revenueValues: number[] = [];
  const costValues: number[] = [];
  const grossProfitValues: number[] = [];
  const sgaValues: number[] = [];
  const operatingIncomeValues: number[] = [];
  const ordinaryIncomeValues: number[] = [];

  for (const month of months) {
    const data = monthlyData.get(month)!;
    const revenue = data.get('revenue') ?? 0;
    const cost = data.get('cost_of_sales') ?? 0;
    const grossProfit = revenue - cost;
    const sga = data.get('sga_expenses') ?? 0;
    const operatingIncome = grossProfit - sga;
    const nonOpIncome = data.get('non_operating_income') ?? 0;
    const nonOpExpense = data.get('non_operating_expense') ?? 0;
    const ordinaryIncome = operatingIncome + nonOpIncome - nonOpExpense;

    revenueValues.push(revenue);
    costValues.push(cost);
    grossProfitValues.push(grossProfit);
    sgaValues.push(sga);
    operatingIncomeValues.push(operatingIncome);
    ordinaryIncomeValues.push(ordinaryIncome);
  }

  const series: TrendSeries[] = [
    { label: '売上高', values: revenueValues },
    { label: '売上原価', values: costValues },
    { label: '売上総利益', values: grossProfitValues },
    { label: '販管費', values: sgaValues },
    { label: '営業利益', values: operatingIncomeValues },
    { label: '経常利益', values: ordinaryIncomeValues },
  ];

  return { months, series };
}

/**
 * 売上高の部門別月次推移
 */
export function generateDepartmentRevenueTrend(
  entries: JournalEntry[],
  periodStart: string,
  periodEnd: string,
  departmentNames: string[],
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): MonthlyTrend {
  const months = getMonthRange(periodStart, periodEnd);

  // 部門 × 月のマトリクス
  const deptMonthly = new Map<string, number[]>();
  for (const dept of departmentNames) {
    deptMonthly.set(dept, new Array(months.length).fill(0));
  }

  for (const entry of entries) {
    const ym = toYearMonth(entry.date);
    const monthIdx = months.indexOf(ym);
    if (monthIdx === -1) continue;

    const account = findAccountByCode(entry.accountCode, accounts);
    if (account?.category !== 'revenue') continue;

    const deptName = entry.departmentName;
    if (!deptName || !deptMonthly.has(deptName)) continue;

    const values = deptMonthly.get(deptName)!;
    values[monthIdx] += entry.credit - entry.debit;
  }

  const series: TrendSeries[] = departmentNames.map(dept => ({
    label: dept,
    values: deptMonthly.get(dept)!,
  }));

  return { months, series };
}
