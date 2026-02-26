import {
  ManagementAccountingReport,
  DepartmentProfitTable,
  StaffAllocationTable,
  StaffAllocationInput,
  Quarter,
} from '../types/management-report';
import { JournalEntry, AccountMaster } from '../types';
import { DEFAULT_ACCOUNTS, findAccountByCode } from '../utils/accounts';
import { getQuarterMonths } from './quarterly-budget-actual';

/**
 * 管理会計レポートを生成
 *
 * 部門別営業利益と人件費配分を計算する。
 */
export function generateManagementAccountingReport(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
  staffAllocation: StaffAllocationInput,
  fiscalYearStart: string,
  previousFiscalYearStart: string,
  periodLabel: string,
  departmentNames: string[],
  accounts: AccountMaster[] = DEFAULT_ACCOUNTS
): ManagementAccountingReport {
  const quarter = staffAllocation.quarter;
  const months = getQuarterMonths(fiscalYearStart, quarter);
  const prevMonths = getQuarterMonths(previousFiscalYearStart, quarter);

  // 各部門名 + "本社費" + "合計"
  const allDepts = [...departmentNames, '本社費'];
  const profitColumns = [...allDepts, '合計'];

  // 部門別の売上・原価・販管費を集計
  const sumForDept = (entries: JournalEntry[], targetMonths: string[], deptName: string, category: string): number => {
    let total = 0;
    for (const entry of entries) {
      const ym = entry.date.substring(0, 7);
      if (!targetMonths.includes(ym)) continue;

      const account = findAccountByCode(entry.accountCode, accounts);
      if (account?.category !== category) continue;

      // 本社費: 部門なしの仕訳
      if (deptName === '本社費') {
        if (entry.departmentName) continue;
      } else {
        if (entry.departmentName !== deptName) continue;
      }

      if (category === 'revenue') {
        total += entry.credit - entry.debit;
      } else {
        total += entry.debit - entry.credit;
      }
    }
    return total;
  };

  // 千円単位に変換
  const toSen = (n: number): number => Math.round(n / 1000);

  // 当期の部門別集計
  const currentRevenue = allDepts.map(d => toSen(sumForDept(currentEntries, months, d, 'revenue')));
  const currentCos = allDepts.map(d => toSen(sumForDept(currentEntries, months, d, 'cost_of_sales')));
  const currentSga = allDepts.map(d => toSen(sumForDept(currentEntries, months, d, 'sga_expenses')));

  // 人件費配賦（千円単位）
  const laborCosts = allDepts.map(deptName => {
    let total = 0;
    for (const member of staffAllocation.members) {
      const pct = member.allocation[deptName] ?? 0;
      total += member.monthlyCost * 3 * (pct / 100); // 四半期 = 3ヶ月分
    }
    return toSen(total);
  });

  // 売上総利益
  const grossProfit = currentRevenue.map((r, i) => r - currentCos[i]);

  // 営業利益 = 売上総利益 - 販管費 - 人件費配賦
  const operatingProfit = grossProfit.map((gp, i) => gp - currentSga[i] - laborCosts[i]);

  // 合計列を追加
  const addTotal = (arr: number[]): number[] => [...arr, arr.reduce((a, b) => a + b, 0)];

  const profitRows = [
    { label: '売上高', values: addTotal(currentRevenue) },
    { label: '売上原価', values: addTotal(currentCos) },
    { label: '売上総利益', values: addTotal(grossProfit) },
    { label: '人件費配賦', values: addTotal(laborCosts) },
    { label: '販管費', values: addTotal(currentSga) },
    { label: '営業利益', values: addTotal(operatingProfit) },
  ];

  // 前期比率の計算
  const prevRevenue = allDepts.map(d => toSen(sumForDept(previousEntries, prevMonths, d, 'revenue')));
  const prevCos = allDepts.map(d => toSen(sumForDept(previousEntries, prevMonths, d, 'cost_of_sales')));
  const prevSga = allDepts.map(d => toSen(sumForDept(previousEntries, prevMonths, d, 'sga_expenses')));
  const prevGrossProfit = prevRevenue.map((r, i) => r - prevCos[i]);
  const prevOperatingProfit = prevGrossProfit.map((gp, i) => gp - prevSga[i]);

  const ratioValues = operatingProfit.map((op, i) => {
    const prev = prevOperatingProfit[i];
    if (prev === 0) return '-';
    return `${Math.round((op / prev) * 100)}%`;
  });
  const totalPrevOp = prevOperatingProfit.reduce((a, b) => a + b, 0);
  const totalCurOp = operatingProfit.reduce((a, b) => a + b, 0);
  ratioValues.push(totalPrevOp !== 0 ? `${Math.round((totalCurOp / totalPrevOp) * 100)}%` : '-');

  const profitTable: DepartmentProfitTable = {
    quarterLabel: `${periodLabel} ${quarter}`,
    departments: profitColumns,
    rows: profitRows,
    ratioRows: [
      { label: `前期 ${quarter}比`, values: ratioValues },
    ],
  };

  // 人件費配分テーブル
  const deptCodes = [...departmentNames, '本社費'];
  const staffAllocationTable: StaffAllocationTable = {
    quarterLabel: quarter,
    staffMembers: staffAllocation.members.map(m => m.name),
    departments: deptCodes,
    allocations: staffAllocation.members.map(m =>
      deptCodes.map(d => m.allocation[d] ?? 0)
    ),
  };

  return {
    period: periodLabel,
    quarter,
    title: `管理会計 ${quarter}`,
    subtitle: 'Q毎の営業利益差を考慮しながら、リソース配分を検討していく',
    profitTable,
    staffAllocationTable,
    comments: [],
  };
}
